/**
 * API Route: /api/n8n/trigger
 *
 * Triggers n8n workflows (optimizer, analyzer, etc.) with specified parameters.
 * Used by optimization panel to request prompt optimization.
 *
 * @module api/n8n/trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

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
      return NextResponse.json(
        {
          error: 'Invalid workflow_type. Must be one of: optimizer, analyzer, personas_generator, personas_validator',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Validate test_run_id for optimizer and analyzer workflows
    if (['optimizer', 'analyzer'].includes(body.workflow_type)) {
      if (!body.test_run_id) {
        return NextResponse.json(
          { error: 'test_run_id is required for optimizer/analyzer workflows', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      if (!isValidUUID(body.test_run_id)) {
        return NextResponse.json(
          { error: 'test_run_id must be a valid UUID', code: 'INVALID_UUID' },
          { status: 400 }
        )
      }

      // Verify test run exists
      const { data: testRun, error: testRunError } = await supabase
        .from('test_runs')
        .select('id, status, prompt_version_id, analysis_report')
        .eq('id', body.test_run_id)
        .single()

      if (testRunError || !testRun) {
        return NextResponse.json(
          { error: 'Test run not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      // For optimizer, require analysis_report to exist
      if (body.workflow_type === 'optimizer' && !testRun.analysis_report) {
        return NextResponse.json(
          { error: 'Test run must have analysis_report before optimization', code: 'NO_ANALYSIS' },
          { status: 400 }
        )
      }
    }

    // ========================================================================
    // Get Webhook URL
    // ========================================================================

    const webhookUrl = await getWebhookUrl(body.workflow_type)

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: `No webhook URL configured for workflow: ${body.workflow_type}. Configure in workflow_configs table.`,
          code: 'NO_WEBHOOK_URL'
        },
        { status: 400 }
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
      return NextResponse.json(
        {
          error: 'Failed to trigger workflow',
          code: 'WEBHOOK_FAILED',
          details: `HTTP ${response.status}`
        },
        { status: 502 }
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

    return NextResponse.json(responseData, { status: 200 })

  } catch (error) {
    console.error('[n8n/trigger] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
