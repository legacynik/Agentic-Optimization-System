/**
 * API Route: /api/generate-personas
 *
 * Triggers n8n Personas Generator workflow via webhook.
 * - POST: Send generation request to n8n
 *
 * @module api/generate-personas
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

interface GeneratePersonasRequest {
  prompt_version_id: string
  prompt_name: string
  count?: number
}

/**
 * POST /api/generate-personas
 *
 * Reads webhook URL from workflow_configs (type='personas_generator'),
 * sends generation request to n8n, returns status.
 *
 * Request body:
 * - prompt_version_id: UUID (required)
 * - prompt_name: string (required)
 * - count: number (optional, default 5)
 */
export async function POST(request: NextRequest) {
  try {
    const body: GeneratePersonasRequest = await request.json()

    // Validate required fields
    if (!body.prompt_version_id || !isValidUUID(body.prompt_version_id)) {
      return apiError('Valid prompt_version_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.prompt_name || body.prompt_name.trim() === '') {
      return apiError('prompt_name is required', 'VALIDATION_ERROR', 400)
    }

    const count = body.count || 5
    if (count < 1 || count > 20) {
      return apiError('count must be between 1 and 20', 'VALIDATION_ERROR', 400)
    }

    // Verify prompt version exists
    const { data: promptVersion, error: pvError } = await supabase
      .from('prompt_versions')
      .select('id, prompt_name')
      .eq('id', body.prompt_version_id)
      .single()

    if (pvError || !promptVersion) {
      return apiError('Prompt version not found', 'NOT_FOUND', 404)
    }

    // Get webhook URL from workflow_configs
    const { data: config } = await supabase
      .from('workflow_configs')
      .select('webhook_url, is_active')
      .eq('workflow_type', 'personas_generator')
      .single()

    const webhookUrl = config?.webhook_url || process.env.N8N_PERSONAS_GENERATOR_WEBHOOK

    if (!webhookUrl) {
      return apiError(
        'No webhook URL configured for personas_generator. Configure it in Settings.',
        'CONFIG_MISSING',
        400
      )
    }

    if (config && !config.is_active) {
      return apiError(
        'Personas generator workflow is disabled. Enable it in Settings.',
        'WORKFLOW_DISABLED',
        400
      )
    }

    // Trigger n8n webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': process.env.N8N_SECRET || ''
      },
      body: JSON.stringify({
        prompt_version_id: body.prompt_version_id,
        prompt_name: body.prompt_name.trim(),
        count
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[generate-personas] Webhook failed:', response.status, errorText)
      return apiError(
        'Failed to trigger personas generation workflow',
        'WEBHOOK_FAILED',
        502,
        `n8n responded with status ${response.status}`
      )
    }

    // Update workflow_configs tracking
    const { data: currentConfig } = await supabase
      .from('workflow_configs')
      .select('total_executions')
      .eq('workflow_type', 'personas_generator')
      .single()

    await supabase
      .from('workflow_configs')
      .update({
        last_triggered_at: new Date().toISOString(),
        total_executions: (currentConfig?.total_executions || 0) + 1
      })
      .eq('workflow_type', 'personas_generator')

    console.log(`[generate-personas] Triggered for prompt "${body.prompt_name}" (${body.prompt_version_id}), count=${count}`)

    return apiSuccess({
      status: 'triggered',
      prompt_version_id: body.prompt_version_id,
      prompt_name: body.prompt_name,
      count,
      message: `Persona generation triggered. ${count} personas will be created with status 'pending'.`
    }, undefined, 202)

  } catch (error) {
    console.error('[generate-personas] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
