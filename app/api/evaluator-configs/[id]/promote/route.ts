/**
 * API Route: /api/evaluator-configs/[id]/promote
 *
 * Promotes an evaluator config as the default for its prompt.
 * - POST: Set is_promoted=true for this config, false for others in same prompt
 *
 * @module api/evaluator-configs/[id]/promote
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

// ============================================================================
// POST Handler - Promote Evaluator Config
// ============================================================================

/**
 * POST /api/evaluator-configs/[id]/promote
 *
 * Promotes an evaluator config as the default (is_promoted=true) for its prompt.
 * Automatically unpromotes any other config for the same prompt.
 *
 * Business rule: Only ONE evaluator_config per prompt can have is_promoted=true.
 *
 * This operation is idempotent - calling it multiple times has the same effect.
 */
export async function POST(
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

    // Step 1: Fetch the evaluator config to get its prompt_id
    const { data: config, error: fetchError } = await supabase
      .from('evaluator_configs')
      .select('id, name, version, prompt_id, is_promoted, status')
      .eq('id', id)
      .single()

    if (fetchError || !config) {
      console.error('[evaluator-configs/promote] Config not found:', fetchError)
      return NextResponse.json(
        { error: 'Evaluator config not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Idempotency check: if already promoted, just return success
    if (config.is_promoted) {
      console.log(`[evaluator-configs/promote] Config already promoted: ${config.name} v${config.version} (${config.id})`)
      return NextResponse.json({
        success: true,
        message: 'Evaluator config already promoted',
        data: config
      })
    }

    // Step 2a: Unpromote all other configs for this prompt
    const { error: unpromoteError } = await supabase
      .from('evaluator_configs')
      .update({
        is_promoted: false,
        updated_at: new Date().toISOString()
      })
      .eq('prompt_id', config.prompt_id)
      .eq('is_promoted', true)

    if (unpromoteError) {
      console.error('[evaluator-configs/promote] Error unpromoting other configs:', unpromoteError)
      return NextResponse.json(
        { error: 'Failed to unpromote other configs', code: 'INTERNAL_ERROR', details: unpromoteError.message },
        { status: 500 }
      )
    }

    // Step 2b: Promote this config
    const { data: promotedConfig, error: promoteError } = await supabase
      .from('evaluator_configs')
      .update({
        is_promoted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (promoteError || !promotedConfig) {
      console.error('[evaluator-configs/promote] Error promoting config:', promoteError)
      return NextResponse.json(
        { error: 'Failed to promote evaluator config', code: 'INTERNAL_ERROR', details: promoteError?.message },
        { status: 500 }
      )
    }

    console.log(`[evaluator-configs/promote] Promoted config: ${promotedConfig.name} v${promotedConfig.version} (${promotedConfig.id})`)

    // Fetch prompt name for response
    const { data: prompt } = await supabase
      .from('prompts')
      .select('name')
      .eq('id', promotedConfig.prompt_id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Evaluator config promoted successfully',
      data: {
        ...promotedConfig,
        prompt_name: prompt?.name || null
      }
    })

  } catch (error) {
    console.error('[evaluator-configs/promote] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
