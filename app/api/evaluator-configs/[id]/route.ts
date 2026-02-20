/**
 * API Route: /api/evaluator-configs/[id]
 *
 * Operations for a single evaluator config.
 * - GET: Fetch config details
 * - PUT: Update config
 * - DELETE: Soft delete config (set status='deprecated')
 *
 * @module api/evaluator-configs/[id]
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

/** Criteria taxonomy format */
interface CriteriaTaxonomy {
  core: string[]
  domain: string[]
  weights: Record<string, number>
}

/** LLM config for model selection */
interface LlmConfig {
  judge: { model: string; provider: string; fallback: string }
  analyzer: { model: string; provider: string; fallback: string }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates criteria taxonomy format
 */
function validateCriteria(criteria: unknown): criteria is CriteriaTaxonomy {
  if (typeof criteria !== 'object' || criteria === null || Array.isArray(criteria)) {
    return false
  }

  const obj = criteria as Record<string, unknown>

  if (!Array.isArray(obj.core) || obj.core.length === 0) return false
  if (!obj.core.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false

  if (!Array.isArray(obj.domain)) return false
  if (!obj.domain.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false

  if (typeof obj.weights !== 'object' || obj.weights === null || Array.isArray(obj.weights)) return false
  for (const value of Object.values(obj.weights as Record<string, unknown>)) {
    if (typeof value !== 'number') return false
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
    const rc = obj[role] as Record<string, unknown> | undefined
    if (!rc || typeof rc !== 'object') return false
    if (typeof rc.model !== 'string' || typeof rc.provider !== 'string' || typeof rc.fallback !== 'string') return false
  }
  return true
}

/**
 * REQ-T2.7: Validates criteria names against criteria_definitions table.
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
// GET Handler - Get Evaluator Config Details
// ============================================================================

/**
 * GET /api/evaluator-configs/[id]
 *
 * Fetches a single evaluator config with prompt details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid evaluator config ID format', 'INVALID_UUID', 400)
    }

    // Fetch config
    const { data: config, error: configError } = await supabase
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
      `)
      .eq('id', id)
      .single()

    if (configError || !config) {
      console.error('[evaluator-configs/id] Error fetching config:', configError)
      return apiError('Evaluator config not found', 'NOT_FOUND', 404)
    }

    // Fetch prompt version name
    const { data: promptVersion } = await supabase
      .from('prompt_versions')
      .select('prompt_name')
      .eq('id', config.prompt_version_id)
      .single()

    const transformedConfig = {
      ...config,
      prompt_name: promptVersion?.prompt_name || null
    }

    return apiSuccess(transformedConfig)

  } catch (error) {
    console.error('[evaluator-configs/id] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// PUT Handler - Update Evaluator Config
// ============================================================================

/**
 * PUT /api/evaluator-configs/[id]
 *
 * Updates an evaluator config's fields.
 *
 * Updatable fields:
 * - name, version, description
 * - criteria, system_prompt_template, success_config
 * - status, is_promoted
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!isValidUUID(id)) {
      return apiError('Invalid evaluator config ID format', 'INVALID_UUID', 400)
    }

    // Define allowed update fields (cannot update prompt_version_id)
    const allowedFields = [
      'name', 'version', 'description',
      'criteria', 'llm_config', 'system_prompt_template', 'success_config',
      'status', 'is_promoted'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 'VALIDATION_ERROR', 400)
    }

    // Validate criteria if provided
    if (updateData.criteria !== undefined) {
      if (!validateCriteria(updateData.criteria)) {
        return apiError('Invalid criteria format. Must be { core: string[], domain: string[], weights: Record<string, number> }', 'VALIDATION_ERROR', 400)
      }
      // REQ-T2.7: Validate criteria names exist in DB
      const unknownNames = await findUnknownCriteriaNames(updateData.criteria as CriteriaTaxonomy)
      if (unknownNames.length > 0) {
        return apiError(`Unknown criteria names: ${unknownNames.join(', ')}. All names must exist in criteria_definitions.`, 'VALIDATION_ERROR', 400)
      }
    }

    // Validate llm_config if provided
    if (updateData.llm_config !== undefined) {
      if (!validateLlmConfig(updateData.llm_config)) {
        return apiError('Invalid llm_config format. Must have judge and analyzer with model, provider, fallback', 'VALIDATION_ERROR', 400)
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
      if (!validStatuses.includes(updateData.status as EvaluatorStatus)) {
        return apiError('Invalid status. Must be one of: draft, active, deprecated', 'VALIDATION_ERROR', 400)
      }
    }

    // Validate success_config if provided
    if (updateData.success_config) {
      const config = updateData.success_config as Record<string, unknown>
      if (typeof config.min_score !== 'number') {
        return apiError('success_config.min_score must be a number', 'VALIDATION_ERROR', 400)
      }
    }

    // Check for duplicate version if version is being updated
    if (updateData.version) {
      // First get the current config to get its prompt_id
      const { data: currentConfig } = await supabase
        .from('evaluator_configs')
        .select('prompt_version_id, version')
        .eq('id', id)
        .single()

      if (currentConfig && updateData.version !== currentConfig.version) {
        const { data: existing } = await supabase
          .from('evaluator_configs')
          .select('id')
          .eq('prompt_version_id', currentConfig.prompt_version_id)
          .eq('version', updateData.version)
          .single()

        if (existing) {
          return apiError('An evaluator config with this version already exists for this prompt', 'DUPLICATE', 409)
        }
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('evaluator_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[evaluator-configs/id] Error updating config:', error)
      return apiError('Failed to update evaluator config', 'INTERNAL_ERROR', 500, error.message)
    }

    if (!data) {
      return apiError('Evaluator config not found', 'NOT_FOUND', 404)
    }

    console.log(`[evaluator-configs/id] Updated config: ${data.name} v${data.version} (${data.id})`)

    return apiSuccess(data)

  } catch (error) {
    console.error('[evaluator-configs/id] PUT error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// DELETE Handler - Soft Delete Evaluator Config
// ============================================================================

/**
 * DELETE /api/evaluator-configs/[id]
 *
 * Soft deletes an evaluator config by setting status='deprecated'.
 * Does NOT perform hard delete for data integrity.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid evaluator config ID format', 'INVALID_UUID', 400)
    }

    // Check if config exists
    const { data: config, error: checkError } = await supabase
      .from('evaluator_configs')
      .select('id, name, version, status')
      .eq('id', id)
      .single()

    if (checkError || !config) {
      return apiError('Evaluator config not found', 'NOT_FOUND', 404)
    }

    if (config.status === 'deprecated') {
      return apiError('Evaluator config is already deprecated', 'ALREADY_DEPRECATED', 400)
    }

    // Soft delete: set status to 'deprecated'
    const { error: updateError } = await supabase
      .from('evaluator_configs')
      .update({
        status: 'deprecated',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[evaluator-configs/id] Error deprecating config:', updateError)
      return apiError('Failed to deprecate evaluator config', 'INTERNAL_ERROR', 500, updateError.message)
    }

    console.log(`[evaluator-configs/id] Deprecated config: ${config.name} v${config.version} (${config.id})`)

    return apiSuccess({ message: 'Evaluator config deprecated successfully' })

  } catch (error) {
    console.error('[evaluator-configs/id] DELETE error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
