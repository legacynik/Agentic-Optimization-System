/**
 * API Route: /api/test-runs/[id]/continue
 *
 * Continues a test run after human review pause.
 * Used in full_cycle_with_review mode after user adds notes and approves.
 *
 * @module api/test-runs/[id]/continue
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

/**
 * Triggers the analyzer workflow to continue the cycle
 */
async function triggerAnalyzerWorkflow(testRunId: string): Promise<boolean> {
  // Get webhook URL from workflow_configs
  const { data: config } = await supabase
    .from('workflow_configs')
    .select('webhook_url')
    .eq('workflow_type', 'analyzer')
    .single()

  const webhookUrl = config?.webhook_url || process.env.N8N_ANALYZER_WEBHOOK

  if (!webhookUrl) {
    console.warn('[test-runs/continue] No webhook URL configured for analyzer')
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': process.env.N8N_SECRET || ''
      },
      body: JSON.stringify({
        test_run_id: testRunId,
        action: 'continue_after_review',
        timestamp: Date.now()
      })
    })

    if (!response.ok) {
      console.error('[test-runs/continue] Analyzer webhook response not ok:', response.status)
      return false
    }

    console.log(`[test-runs/continue] Triggered analyzer for test run ${testRunId}`)
    return true

  } catch (error) {
    console.error('[test-runs/continue] Error triggering analyzer:', error)
    return false
  }
}

/**
 * POST /api/test-runs/[id]/continue
 *
 * Continues a test run that is awaiting human review.
 * This triggers the Analyzer workflow to proceed with the optimization cycle.
 *
 * Request body (optional):
 * - skip_to_next_iteration: boolean - Skip analysis and go to next test iteration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Validate UUID format
    if (!isValidUUID(id)) {
      return apiError('Invalid test run ID format', 'INVALID_UUID', 400)
    }

    // Check if test run exists and is awaiting review
    const { data: testRun, error: checkError } = await supabase
      .from('test_runs')
      .select('id, test_run_code, status, awaiting_review, mode, current_iteration, max_iterations')
      .eq('id', id)
      .single()

    if (checkError || !testRun) {
      return apiError('Test run not found', 'NOT_FOUND', 404)
    }

    // Validate test run is in correct state
    if (!testRun.awaiting_review || testRun.status !== 'awaiting_review') {
      return apiError(
        'Test run is not awaiting review',
        'VALIDATION_ERROR',
        400
      )
    }

    // Check if we've reached max iterations
    if (testRun.current_iteration >= testRun.max_iterations) {
      return apiError(
        'Max iterations reached. Cannot continue.',
        'VALIDATION_ERROR',
        400
      )
    }

    // Update test run status
    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        awaiting_review: false,
        status: 'running',
        review_completed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[test-runs/continue] Error updating test run:', updateError)
      return apiError('Failed to update test run', 'INTERNAL_ERROR', 500, { details: updateError.message })
    }

    // Trigger the analyzer workflow
    const analyzerTriggered = await triggerAnalyzerWorkflow(id)

    console.log(`[test-runs/continue] Continued test run: ${testRun.test_run_code}`)

    return apiSuccess({
      test_run_id: id,
      test_run_code: testRun.test_run_code,
      message: analyzerTriggered
        ? 'Test run continued. Analyzer workflow triggered.'
        : 'Test run continued but analyzer webhook not configured. Configure analyzer webhook URL in settings.',
      analyzer_triggered: analyzerTriggered,
      next_iteration: testRun.current_iteration + 1,
      max_iterations: testRun.max_iterations
    })

  } catch (error) {
    console.error('[test-runs/continue] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
