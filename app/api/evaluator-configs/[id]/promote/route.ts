/**
 * API Route: /api/evaluator-configs/[id]/promote
 *
 * Promotes an evaluator config as the default for its prompt.
 * - POST: Set is_promoted=true for this config, false for others in same prompt
 *
 * @module api/evaluator-configs/[id]/promote
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

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
      return apiError('Invalid evaluator config ID format', 'INVALID_UUID', 400)
    }

    // Step 1: Fetch the evaluator config to get its prompt_id
    const { data: config, error: fetchError } = await supabase
      .from('evaluator_configs')
      .select('id, name, version, prompt_id, is_promoted, status')
      .eq('id', id)
      .single()

    if (fetchError || !config) {
      console.error('[evaluator-configs/promote] Config not found:', fetchError)
      return apiError('Evaluator config not found', 'NOT_FOUND', 404)
    }

    // Idempotency check: if already promoted, just return success
    if (config.is_promoted) {
      console.log(`[evaluator-configs/promote] Config already promoted: ${config.name} v${config.version} (${config.id})`)
      return apiSuccess({
        ...config,
        message: 'Evaluator config already promoted'
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
      return apiError('Failed to unpromote other configs', 'INTERNAL_ERROR', 500, unpromoteError.message)
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
      return apiError('Failed to promote evaluator config', 'INTERNAL_ERROR', 500, promoteError?.message)
    }

    console.log(`[evaluator-configs/promote] Promoted config: ${promotedConfig.name} v${promotedConfig.version} (${promotedConfig.id})`)

    // Fetch prompt name for response
    const { data: prompt } = await supabase
      .from('prompts')
      .select('name')
      .eq('id', promotedConfig.prompt_id)
      .single()

    return apiSuccess({
      ...promotedConfig,
      prompt_name: prompt?.name || null,
      message: 'Evaluator config promoted successfully'
    })

  } catch (error) {
    console.error('[evaluator-configs/promote] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
