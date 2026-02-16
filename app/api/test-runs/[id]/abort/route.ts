/**
 * API Route: /api/test-runs/[id]/abort
 *
 * Kill switch for running test runs.
 * Sets status to 'aborted' so n8n workflows check and stop gracefully.
 *
 * @module api/test-runs/[id]/abort
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

/**
 * POST /api/test-runs/[id]/abort
 *
 * Aborts a running test run. The n8n workflow should check
 * the status before each major operation and stop gracefully.
 *
 * Per PRD v2.4: Check Abort is positioned at 2 points in the workflow:
 * 1. Before LLM call
 * 2. After LLM call
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return apiError('Invalid test run ID format', 'INVALID_UUID', 400)
    }

    // Check if test run exists and is running
    const { data: testRun, error: checkError } = await supabase
      .from('test_runs')
      .select('id, test_run_code, status')
      .eq('id', id)
      .single()

    if (checkError || !testRun) {
      return apiError('Test run not found', 'NOT_FOUND', 404)
    }

    // Only running or pending tests can be aborted
    if (!['running', 'pending', 'awaiting_review'].includes(testRun.status)) {
      return apiError(
        `Cannot abort test with status "${testRun.status}". Only running, pending, or awaiting_review tests can be aborted.`,
        'VALIDATION_ERROR',
        400
      )
    }

    // Update status to aborted
    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        status: 'aborted',
        stopped_reason: 'human_stop',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[test-runs/abort] Error aborting test run:', updateError)
      return apiError('Failed to abort test run', 'INTERNAL_ERROR', 500, { details: updateError.message })
    }

    console.log(`[test-runs/abort] Aborted test run: ${testRun.test_run_code}`)

    return apiSuccess({
      test_run_id: id,
      test_run_code: testRun.test_run_code,
      message: 'Test run aborted. The n8n workflow will stop at the next Check Abort point.',
      previous_status: testRun.status,
      new_status: 'aborted'
    })

  } catch (error) {
    console.error('[test-runs/abort] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
