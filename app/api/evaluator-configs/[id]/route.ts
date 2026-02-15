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
      return NextResponse.json(
        { error: 'Invalid evaluator config ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Fetch config
    const { data: config, error: configError } = await supabase
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
      `)
      .eq('id', id)
      .single()

    if (configError || !config) {
      console.error('[evaluator-configs/id] Error fetching config:', configError)
      return NextResponse.json(
        { error: 'Evaluator config not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Fetch prompt name separately
    const { data: prompt } = await supabase
      .from('prompts')
      .select('name')
      .eq('id', config.prompt_id)
      .single()

    // Transform data to include prompt name
    const transformedConfig = {
      ...config,
      prompt_name: prompt?.name || null
    }

    return NextResponse.json({ data: transformedConfig })

  } catch (error) {
    console.error('[evaluator-configs/id] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: 'Invalid evaluator config ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Define allowed update fields (cannot update prompt_id)
    const allowedFields = [
      'name', 'version', 'description',
      'criteria', 'system_prompt_template', 'success_config',
      'status', 'is_promoted'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate criteria if provided
    if (updateData.criteria !== undefined) {
      if (!validateCriteria(updateData.criteria)) {
        return NextResponse.json(
          {
            error: 'Invalid criteria format. Must be non-empty array with items containing at least "name" field',
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses: EvaluatorStatus[] = ['draft', 'active', 'deprecated']
      if (!validStatuses.includes(updateData.status as EvaluatorStatus)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: draft, active, deprecated', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Validate success_config if provided
    if (updateData.success_config) {
      const config = updateData.success_config as Record<string, unknown>
      if (typeof config.min_score !== 'number') {
        return NextResponse.json(
          { error: 'success_config.min_score must be a number', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate version if version is being updated
    if (updateData.version) {
      // First get the current config to get its prompt_id
      const { data: currentConfig } = await supabase
        .from('evaluator_configs')
        .select('prompt_id, version')
        .eq('id', id)
        .single()

      if (currentConfig && updateData.version !== currentConfig.version) {
        const { data: existing } = await supabase
          .from('evaluator_configs')
          .select('id')
          .eq('prompt_id', currentConfig.prompt_id)
          .eq('version', updateData.version)
          .single()

        if (existing) {
          return NextResponse.json(
            { error: 'An evaluator config with this version already exists for this prompt', code: 'DUPLICATE' },
            { status: 409 }
          )
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
      return NextResponse.json(
        { error: 'Failed to update evaluator config', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Evaluator config not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log(`[evaluator-configs/id] Updated config: ${data.name} v${data.version} (${data.id})`)

    return NextResponse.json({ data })

  } catch (error) {
    console.error('[evaluator-configs/id] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: 'Invalid evaluator config ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Check if config exists
    const { data: config, error: checkError } = await supabase
      .from('evaluator_configs')
      .select('id, name, version, status')
      .eq('id', id)
      .single()

    if (checkError || !config) {
      return NextResponse.json(
        { error: 'Evaluator config not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (config.status === 'deprecated') {
      return NextResponse.json(
        { error: 'Evaluator config is already deprecated', code: 'ALREADY_DEPRECATED' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to deprecate evaluator config', code: 'INTERNAL_ERROR', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[evaluator-configs/id] Deprecated config: ${config.name} v${config.version} (${config.id})`)

    return NextResponse.json({
      success: true,
      message: 'Evaluator config deprecated successfully'
    })

  } catch (error) {
    console.error('[evaluator-configs/id] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
