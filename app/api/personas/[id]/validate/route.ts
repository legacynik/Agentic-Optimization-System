/**
 * API Route: /api/personas/[id]/validate
 *
 * Triggers LLM validation of a persona via n8n workflow.
 * - POST: Trigger validation for a single persona
 *
 * @module api/personas/[id]/validate
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

/**
 * POST /api/personas/[id]/validate
 *
 * Sets persona to 'pending_validation' and triggers n8n persona validator workflow.
 * The workflow will score naturalness, coherence, testability and update the persona.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid persona ID format', 'VALIDATION_ERROR', 400)
    }

    // Verify persona exists
    const { data: persona, error: fetchError } = await supabase
      .from('personas')
      .select('id, name, validation_status')
      .eq('id', id)
      .single()

    if (fetchError || !persona) {
      return apiError('Persona not found', 'NOT_FOUND', 404)
    }

    // Set status to pending_validation
    const { error: updateError } = await supabase
      .from('personas')
      .update({
        validation_status: 'pending_validation',
        validation_score: null,
        validation_details: null,
        rejection_reason: null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('[personas/validate] Failed to update status:', updateError)
      return apiError('Failed to update persona status', 'INTERNAL_ERROR', 500)
    }

    // Trigger n8n personas_validator workflow
    const { data: webhookConfig } = await supabase
      .from('workflow_configs')
      .select('webhook_url, is_active, config')
      .eq('workflow_type', 'personas_validator')
      .single()

    if (webhookConfig?.webhook_url && webhookConfig.is_active) {
      try {
        const triggerPayload = {
          persona_id: id,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/n8n/webhook`,
          threshold: webhookConfig.config?.threshold ?? 7.0,
          timestamp: Date.now(),
        }

        const response = await fetch(webhookConfig.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-n8n-secret': process.env.N8N_SECRET || '',
          },
          body: JSON.stringify(triggerPayload),
        })

        if (!response.ok) {
          console.error('[personas/validate] n8n webhook failed:', response.status)
          return apiSuccess({
            id,
            validation_status: 'pending_validation',
            warning: 'n8n_trigger_failed',
            message: 'Persona set to pending_validation but n8n trigger failed. Check workflow config.',
          })
        }

        console.log(`[personas/validate] Validation triggered for persona ${id}`)
      } catch (webhookError) {
        console.error('[personas/validate] Failed to trigger n8n:', webhookError)
        return apiSuccess({
          id,
          validation_status: 'pending_validation',
          warning: 'n8n_unreachable',
          message: 'Persona set to pending_validation but n8n is unreachable.',
        })
      }
    } else {
      console.warn('[personas/validate] No personas_validator webhook configured')
      return apiSuccess({
        id,
        validation_status: 'pending_validation',
        warning: 'no_webhook_configured',
        message: 'Persona set to pending_validation. No validator webhook configured — configure in Settings.',
      })
    }

    return apiSuccess({
      id,
      validation_status: 'pending_validation',
      message: 'Validation triggered successfully.',
    })
  } catch (error) {
    console.error('[personas/validate] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
