/**
 * API Route: /api/n8n/trigger
 *
 * Triggers n8n workflows (optimizer, analyzer, etc.) with specified parameters.
 * Used by optimization panel to request prompt optimization.
 *
 * @module api/n8n/trigger
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { isValidUUID } from '@/lib/validation'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

// Create Supabase client for server-side operations
const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid workflow types */
type WorkflowType = 'optimizer' | 'analyzer' | 'personas_generator' | 'personas_validator'

/** Request body for triggering a workflow */
interface TriggerWorkflowRequest {
  workflow_type: WorkflowType
  test_run_id?: string
  selected_suggestions?: string[]
  human_feedback?: string | null
  additional_params?: Record<string, unknown>
}

/** Response for triggered workflow */
interface TriggerWorkflowResponse {
  success: boolean
  execution_id: string
  message: string
  workflow_type: WorkflowType
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets webhook URL for a workflow type from workflow_configs table
 */
async function getWebhookUrl(workflowType: WorkflowType): Promise<string | null> {
  const { data, error } = await supabase
    .from('workflow_configs')
    .select('webhook_url, is_active')
    .eq('workflow_type', workflowType)
    .single()

  if (error || !data) {
    console.error(`[n8n/trigger] Error fetching config for ${workflowType}:`, error)
    return null
  }

  if (!data.is_active) {
    console.warn(`[n8n/trigger] Workflow ${workflowType} is not active`)
    return null
  }

  return data.webhook_url || null
}

/**
 * Updates workflow_configs tracking after trigger
 */
async function updateWorkflowTracking(workflowType: WorkflowType): Promise<void> {
  const { data: currentConfig } = await supabase
    .from('workflow_configs')
    .select('total_executions')
    .eq('workflow_type', workflowType)
    .single()

  await supabase
    .from('workflow_configs')
    .update({
      last_triggered_at: new Date().toISOString(),
      total_executions: (currentConfig?.total_executions || 0) + 1
    })
    .eq('workflow_type', workflowType)
}

// ============================================================================
// POST Handler - Trigger Workflow
// ============================================================================

/**
 * POST /api/n8n/trigger
 *
 * Triggers an n8n workflow with the provided parameters.
 *
 * Request body:
 * - workflow_type: 'optimizer' | 'analyzer' | 'personas_generator' | 'personas_validator'
 * - test_run_id: UUID (required for optimizer/analyzer)
 * - selected_suggestions: string[] (optional, for optimizer)
 * - human_feedback: string (optional, for optimizer)
 * - additional_params: object (optional, extra params for workflow)
 */
export async function POST(request: NextRequest) {
  try {
    const body: TriggerWorkflowRequest = await request.json()

    // ========================================================================
    // Validation
    // ========================================================================

    const validWorkflowTypes: WorkflowType[] = ['optimizer', 'analyzer', 'personas_generator', 'personas_validator']
    if (!body.workflow_type || !validWorkflowTypes.includes(body.workflow_type)) {
      return apiError(
        'Invalid workflow_type. Must be one of: optimizer, analyzer, personas_generator, personas_validator',
        'VALIDATION_ERROR',
        400
      )
    }

    // Validate test_run_id for optimizer and analyzer workflows
    if (['optimizer', 'analyzer'].includes(body.workflow_type)) {
      if (!body.test_run_id) {
        return apiError('test_run_id is required for optimizer/analyzer workflows', 'VALIDATION_ERROR', 400)
      }

      if (!isValidUUID(body.test_run_id)) {
        return apiError('test_run_id must be a valid UUID', 'INVALID_UUID', 400)
      }

      // Verify test run exists
      const { data: testRun, error: testRunError } = await supabase
        .from('test_runs')
        .select('id, status, prompt_version_id, analysis_report')
        .eq('id', body.test_run_id)
        .single()

      if (testRunError || !testRun) {
        return apiError('Test run not found', 'NOT_FOUND', 404)
      }

      // For optimizer, require analysis_report to exist
      if (body.workflow_type === 'optimizer' && !testRun.analysis_report) {
        return apiError('Test run must have analysis_report before optimization', 'NO_ANALYSIS', 400)
      }
    }

    // ========================================================================
    // Get Webhook URL
    // ========================================================================

    const webhookUrl = await getWebhookUrl(body.workflow_type)

    if (!webhookUrl) {
      return apiError(
        `No webhook URL configured for workflow: ${body.workflow_type}. Configure in workflow_configs table.`,
        'NO_WEBHOOK_URL',
        400
      )
    }

    // ========================================================================
    // Trigger Workflow
    // ========================================================================

    const executionId = randomUUID()

    const payload = {
      execution_id: executionId,
      workflow_type: body.workflow_type,
      test_run_id: body.test_run_id,
      selected_suggestions: body.selected_suggestions || [],
      human_feedback: body.human_feedback || null,
      additional_params: body.additional_params || {},
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/n8n/webhook`,
      timestamp: Date.now()
    }

    console.log(`[n8n/trigger] Triggering ${body.workflow_type} workflow with execution_id: ${executionId}`)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': process.env.N8N_SECRET || ''
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[n8n/trigger] Webhook failed with status ${response.status}:`, errorText)
      return apiError(
        'Failed to trigger workflow',
        'WEBHOOK_FAILED',
        502,
        { httpStatus: response.status }
      )
    }

    // Update tracking
    await updateWorkflowTracking(body.workflow_type)

    // ========================================================================
    // Return Response
    // ========================================================================

    const responseData: TriggerWorkflowResponse = {
      success: true,
      execution_id: executionId,
      message: `${body.workflow_type} workflow started`,
      workflow_type: body.workflow_type
    }

    console.log(`[n8n/trigger] Successfully triggered ${body.workflow_type} workflow: ${executionId}`)

    return apiSuccess(responseData)

  } catch (error) {
    console.error('[n8n/trigger] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
