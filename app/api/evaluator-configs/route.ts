/**
 * API Route: /api/evaluator-configs
 *
 * CRUD operations for evaluator configurations.
 * - GET: List evaluator configs with filtering
 * - POST: Create new evaluator config
 *
 * @module api/evaluator-configs
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid evaluator config statuses */
type EvaluatorStatus = 'draft' | 'active' | 'deprecated'

/** Criteria taxonomy format: core + domain + weights */
interface CriteriaTaxonomy {
  core: string[]
  domain: string[]
  weights: Record<string, number>
}

/** LLM config for judge/analyzer model selection */
interface LlmRoleConfig {
  model: string
  provider: string
  fallback: string
}

interface LlmConfig {
  judge: LlmRoleConfig
  analyzer: LlmRoleConfig
}

/** Success config structure */
interface SuccessConfig {
  min_score: number
}

/** Create evaluator config request body */
interface CreateEvaluatorConfigRequest {
  name: string
  version: string
  description?: string
  prompt_version_id: string
  criteria: CriteriaTaxonomy
  system_prompt_template: string
  success_config?: SuccessConfig
  llm_config?: LlmConfig
  status?: EvaluatorStatus
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates criteria taxonomy format: { core: string[], domain: string[], weights: Record<string, number> }
 */
function validateCriteria(criteria: unknown): criteria is CriteriaTaxonomy {
  if (typeof criteria !== 'object' || criteria === null || Array.isArray(criteria)) {
    return false
  }

  const obj = criteria as Record<string, unknown>

  // core must be a non-empty string array
  if (!Array.isArray(obj.core) || obj.core.length === 0) {
    return false
  }
  if (!obj.core.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) {
    return false
  }

  // domain must be a string array (can be empty)
  if (!Array.isArray(obj.domain)) {
    return false
  }
  if (!obj.domain.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) {
    return false
  }

  // weights must be an object with string keys and number values
  if (typeof obj.weights !== 'object' || obj.weights === null || Array.isArray(obj.weights)) {
    return false
  }
  for (const [key, value] of Object.entries(obj.weights as Record<string, unknown>)) {
    if (typeof key !== 'string' || typeof value !== 'number') {
      return false
    }
  }

  return true
}

/**
 * Validates LLM config structure
 */
function validateLlmConfig(config: unknown): config is LlmConfig {
  if (typeof config !== 'object' || config === null) return false
  const obj = config as Record<string, unknown>

  for (const role of ['judge', 'analyzer']) {
    const roleConfig = obj[role]
    if (typeof roleConfig !== 'object' || roleConfig === null) return false
    const rc = roleConfig as Record<string, unknown>
    if (typeof rc.model !== 'string' || typeof rc.provider !== 'string' || typeof rc.fallback !== 'string') {
      return false
    }
  }
  return true
}

/**
 * REQ-T2.7: Validates that all criteria names exist in criteria_definitions table.
 * Returns list of unknown names, or empty array if all valid.
 */
async function findUnknownCriteriaNames(criteria: CriteriaTaxonomy): Promise<string[]> {
  const allNames = [...criteria.core, ...criteria.domain]
  if (allNames.length === 0) return []

  const { data: definitions } = await supabase
    .from('criteria_definitions')
    .select('name')
    .in('name', allNames)

  const knownNames = new Set((definitions || []).map((d: { name: string }) => d.name))
  return allNames.filter(name => !knownNames.has(name))
}

// ============================================================================
// GET Handler - List Evaluator Configs
// ============================================================================

/**
 * GET /api/evaluator-configs
 *
 * Lists evaluator configs with optional filtering.
 *
 * Query params:
 * - prompt_version_id: Filter by prompt version UUID
 * - status: Filter by status ('draft' | 'active' | 'deprecated')
 * - is_promoted: Filter by promotion status
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const promptVersionId = searchParams.get('prompt_version_id')
    const status = searchParams.get('status')
    const isPromoted = searchParams.get('is_promoted')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate prompt_version_id if provided
    if (promptVersionId && !isValidUUID(promptVersionId)) {
      return apiError('Invalid prompt_version_id format', 'VALIDATION_ERROR', 400)
    }

    // Validate status if provided
    if (status) {
      const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
      if (!validStatuses.includes(status as EvaluatorStatus)) {
        return apiError('Invalid status. Must be one of: draft, active, deprecated', 'VALIDATION_ERROR', 400)
      }
    }

    // Build query
    let query = supabase
      .from('evaluator_configs')
      .select(`
        id,
        name,
        version,
        description,
        prompt_version_id,
        criteria,
        llm_config,
        system_prompt_template,
        success_config,
        is_promoted,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (promptVersionId) {
      query = query.eq('prompt_version_id', promptVersionId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (isPromoted !== null) {
      const promotedBool = isPromoted === 'true'
      query = query.eq('is_promoted', promotedBool)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[evaluator-configs] Error fetching configs:', error)
      return apiError('Failed to fetch evaluator configs', 'INTERNAL_ERROR', 500, error.message)
    }

    // Fetch prompt names for all configs
    let transformedData = data
    if (data && data.length > 0) {
      const pvIds = [...new Set(data.map((c: any) => c.prompt_version_id))]
      const { data: promptVersions } = await supabase
        .from('prompt_versions')
        .select('id, prompt_name')
        .in('id', pvIds)

      const pvMap = new Map(promptVersions?.map(p => [p.id, p.prompt_name]) || [])

      transformedData = data.map((config: any) => ({
        ...config,
        prompt_name: pvMap.get(config.prompt_version_id) || null
      }))
    }

    return apiSuccess(transformedData, {
      total: count,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('[evaluator-configs] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// POST Handler - Create Evaluator Config
// ============================================================================

/**
 * POST /api/evaluator-configs
 *
 * Creates a new evaluator config.
 *
 * Request body:
 * - name: string (required)
 * - version: string (required)
 * - prompt_version_id: UUID (required)
 * - criteria: CriteriaItem[] (required)
 * - system_prompt_template: string (required)
 * - description: string (optional)
 * - success_config: SuccessConfig (optional, default: {min_score: 7})
 * - status: EvaluatorStatus (optional, default: 'draft')
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateEvaluatorConfigRequest = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return apiError('name is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.version || body.version.trim() === '') {
      return apiError('version is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.prompt_version_id || !isValidUUID(body.prompt_version_id)) {
      return apiError('Valid prompt_version_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.system_prompt_template || body.system_prompt_template.trim() === '') {
      return apiError('system_prompt_template is required', 'VALIDATION_ERROR', 400)
    }

    // Validate criteria
    if (!body.criteria) {
      return apiError('criteria is required', 'VALIDATION_ERROR', 400)
    }

    if (!validateCriteria(body.criteria)) {
      return apiError('Invalid criteria format. Must be { core: string[], domain: string[], weights: Record<string, number> }', 'VALIDATION_ERROR', 400)
    }

    // REQ-T2.7: Validate all criteria names exist in criteria_definitions
    const unknownNames = await findUnknownCriteriaNames(body.criteria)
    if (unknownNames.length > 0) {
      return apiError(`Unknown criteria names: ${unknownNames.join(', ')}. All names must exist in criteria_definitions.`, 'VALIDATION_ERROR', 400)
    }

    // Validate llm_config if provided
    if (body.llm_config !== undefined && !validateLlmConfig(body.llm_config)) {
      return apiError('Invalid llm_config format. Must have judge and analyzer with model, provider, fallback', 'VALIDATION_ERROR', 400)
    }

    // Validate status if provided
    const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
    if (body.status && !validStatuses.includes(body.status)) {
      return apiError('Invalid status. Must be one of: draft, active, deprecated', 'VALIDATION_ERROR', 400)
    }

    // Check if prompt version exists
    const { data: promptVersion, error: pvError } = await supabase
      .from('prompt_versions')
      .select('id')
      .eq('id', body.prompt_version_id)
      .single()

    if (pvError || !promptVersion) {
      return apiError('Prompt version not found', 'NOT_FOUND', 404)
    }

    // Check for duplicate version for this prompt
    const { data: existing } = await supabase
      .from('evaluator_configs')
      .select('id')
      .eq('prompt_version_id', body.prompt_version_id)
      .eq('version', body.version)
      .single()

    if (existing) {
      return apiError('An evaluator config with this version already exists for this prompt', 'DUPLICATE', 409)
    }

    // Create evaluator config
    const insertData: Record<string, unknown> = {
      name: body.name.trim(),
      version: body.version.trim(),
      description: body.description?.trim() || null,
      prompt_version_id: body.prompt_version_id,
      criteria: body.criteria,
      system_prompt_template: body.system_prompt_template.trim(),
      success_config: body.success_config || { min_score: 7 },
      status: body.status || 'draft',
      is_promoted: false
    }

    // Include llm_config if provided (otherwise DB default applies)
    if (body.llm_config) {
      insertData.llm_config = body.llm_config
    }

    const { data: config, error: createError } = await supabase
      .from('evaluator_configs')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('[evaluator-configs] Error creating config:', createError)
      return apiError('Failed to create evaluator config', 'INTERNAL_ERROR', 500, createError.message)
    }

    console.log(`[evaluator-configs] Created config: ${config.name} v${config.version} (${config.id})`)

    return apiSuccess(config, undefined, 201)

  } catch (error) {
    console.error('[evaluator-configs] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
