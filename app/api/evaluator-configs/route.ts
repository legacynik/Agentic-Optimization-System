/**
 * API Route: /api/evaluator-configs
 *
 * CRUD operations for evaluator configurations.
 * - GET: List evaluator configs with filtering
 * - POST: Create new evaluator config
 *
 * @module api/evaluator-configs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid evaluator config statuses */
type EvaluatorStatus = 'draft' | 'active' | 'deprecated'

/** Criteria item structure */
interface CriteriaItem {
  name: string
  weight?: number
  description?: string
  scoring_guide?: string
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
  prompt_id: string
  criteria: CriteriaItem[]
  system_prompt_template: string
  success_config?: SuccessConfig
  status?: EvaluatorStatus
}

/** Evaluator config response structure */
interface EvaluatorConfigResponse {
  id: string
  name: string
  version: string
  description: string | null
  prompt_id: string
  prompt_name?: string
  criteria: CriteriaItem[]
  system_prompt_template: string
  success_config: SuccessConfig
  is_promoted: boolean
  status: EvaluatorStatus
  created_at: string
  updated_at: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validates criteria array structure
 */
function validateCriteria(criteria: unknown): criteria is CriteriaItem[] {
  if (!Array.isArray(criteria)) {
    return false
  }

  if (criteria.length === 0) {
    return false
  }

  return criteria.every(item => {
    if (typeof item !== 'object' || item === null) {
      return false
    }

    const criteriaItem = item as Record<string, unknown>

    // name is required
    if (typeof criteriaItem.name !== 'string' || criteriaItem.name.trim() === '') {
      return false
    }

    // weight is optional but must be number if present
    if (criteriaItem.weight !== undefined && typeof criteriaItem.weight !== 'number') {
      return false
    }

    // description is optional but must be string if present
    if (criteriaItem.description !== undefined && typeof criteriaItem.description !== 'string') {
      return false
    }

    // scoring_guide is optional but must be string if present
    if (criteriaItem.scoring_guide !== undefined && typeof criteriaItem.scoring_guide !== 'string') {
      return false
    }

    return true
  })
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
 * - prompt_id: Filter by prompt UUID
 * - status: Filter by status ('draft' | 'active' | 'deprecated')
 * - is_promoted: Filter by promotion status
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const promptId = searchParams.get('prompt_id')
    const status = searchParams.get('status')
    const isPromoted = searchParams.get('is_promoted')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate prompt_id if provided
    if (promptId && !isValidUUID(promptId)) {
      return NextResponse.json(
        { error: 'Invalid prompt_id format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status) {
      const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
      if (!validStatuses.includes(status as EvaluatorStatus)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: draft, active, deprecated', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
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
        prompt_id,
        criteria,
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
    if (promptId) {
      query = query.eq('prompt_id', promptId)
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
      return NextResponse.json(
        { error: 'Failed to fetch evaluator configs', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    // Fetch prompt names for all configs
    let transformedData = data
    if (data && data.length > 0) {
      const promptIds = [...new Set(data.map((c: any) => c.prompt_id))]
      const { data: prompts } = await supabase
        .from('prompts')
        .select('id, prompt_name')
        .in('id', promptIds)

      const promptMap = new Map(prompts?.map(p => [p.id, p.prompt_name]) || [])

      transformedData = data.map((config: any) => ({
        ...config,
        prompt_name: promptMap.get(config.prompt_id) || null
      }))
    }

    return NextResponse.json({
      data: transformedData,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0)
      }
    })

  } catch (error) {
    console.error('[evaluator-configs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
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
 * - prompt_id: UUID (required)
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
      return NextResponse.json(
        { error: 'name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!body.version || body.version.trim() === '') {
      return NextResponse.json(
        { error: 'version is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!body.prompt_id || !isValidUUID(body.prompt_id)) {
      return NextResponse.json(
        { error: 'Valid prompt_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!body.system_prompt_template || body.system_prompt_template.trim() === '') {
      return NextResponse.json(
        { error: 'system_prompt_template is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate criteria
    if (!body.criteria) {
      return NextResponse.json(
        { error: 'criteria is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!validateCriteria(body.criteria)) {
      return NextResponse.json(
        {
          error: 'Invalid criteria format. Must be non-empty array with items containing at least "name" field',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: draft, active, deprecated', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check if prompt exists
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', body.prompt_id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check for duplicate version for this prompt
    const { data: existing } = await supabase
      .from('evaluator_configs')
      .select('id')
      .eq('prompt_id', body.prompt_id)
      .eq('version', body.version)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'An evaluator config with this version already exists for this prompt', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    // Create evaluator config
    const { data: config, error: createError } = await supabase
      .from('evaluator_configs')
      .insert({
        name: body.name.trim(),
        version: body.version.trim(),
        description: body.description?.trim() || null,
        prompt_id: body.prompt_id,
        criteria: body.criteria,
        system_prompt_template: body.system_prompt_template.trim(),
        success_config: body.success_config || { min_score: 7 },
        status: body.status || 'draft',
        is_promoted: false
      })
      .select()
      .single()

    if (createError) {
      console.error('[evaluator-configs] Error creating config:', createError)
      return NextResponse.json(
        { error: 'Failed to create evaluator config', code: 'INTERNAL_ERROR', details: createError.message },
        { status: 500 }
      )
    }

    console.log(`[evaluator-configs] Created config: ${config.name} v${config.version} (${config.id})`)

    return NextResponse.json(config, { status: 201 })

  } catch (error) {
    console.error('[evaluator-configs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
