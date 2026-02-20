/**
 * API Route: /api/test-runs/[id]/reconcile
 *
 * Reconciles test run status with evaluation status.
 * Handles cases where callback was lost (evaluation completed but test_run still shows evaluating).
 * - POST: Check evaluation status and fix test_run.status if mismatched
 *
 * @module api/test-runs/[id]/reconcile
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

/**
 * POST /api/test-runs/[id]/reconcile
 *
 * If test_run is stuck in 'evaluating' or 'running' but its promoted evaluation
 * is already 'completed', reconciles by updating test_run to 'completed'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid test run ID format', 'VALIDATION_ERROR', 400)
    }

    // Fetch test run current status
    const { data: testRun, error: trError } = await supabase
      .from('test_runs')
      .select('id, status, overall_score')
      .eq('id', id)
      .single()

    if (trError || !testRun) {
      return apiError('Test run not found', 'NOT_FOUND', 404)
    }

    // Only reconcile if test_run is in a non-terminal state
    const reconcilableStates = ['running', 'evaluating', 'battles_completed']
    if (!reconcilableStates.includes(testRun.status)) {
      return apiSuccess({
        reconciled: false,
        message: `Test run status '${testRun.status}' does not need reconciliation.`,
        status: testRun.status,
      })
    }

    // Check if any evaluation for this test run is completed
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('id, status, overall_score, is_promoted, completed_at')
      .eq('test_run_id', id)
      .order('created_at', { ascending: false })

    if (evalError) {
      console.error('[test-runs/reconcile] Error fetching evaluations:', evalError)
      return apiError('Failed to check evaluations', 'INTERNAL_ERROR', 500)
    }

    const completedEval = evaluations?.find(e => e.status === 'completed')

    if (!completedEval) {
      // Check for failed evaluations
      const failedEval = evaluations?.find(e => e.status === 'failed')
      if (failedEval) {
        const { error: updateError } = await supabase
          .from('test_runs')
          .update({ status: 'failed', stopped_reason: 'Evaluation failed (reconciled)' })
          .eq('id', id)
          .eq('status', testRun.status) // optimistic lock

        if (updateError) {
          return apiError('Failed to reconcile status', 'INTERNAL_ERROR', 500)
        }

        console.log(`[test-runs/reconcile] Test run ${id} reconciled: evaluating → failed`)
        return apiSuccess({ reconciled: true, new_status: 'failed', evaluation_id: failedEval.id })
      }

      return apiSuccess({
        reconciled: false,
        message: 'No completed or failed evaluations found. Status remains unchanged.',
        status: testRun.status,
      })
    }

    // Reconcile: update test_run to completed with optimistic lock on current status
    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        status: 'completed',
        overall_score: completedEval.overall_score ?? testRun.overall_score,
        completed_at: completedEval.completed_at || new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', testRun.status) // optimistic lock — prevents concurrent double-update

    if (updateError) {
      console.error('[test-runs/reconcile] Failed to update:', updateError)
      return apiError('Failed to reconcile status', 'INTERNAL_ERROR', 500)
    }

    console.log(`[test-runs/reconcile] Test run ${id} reconciled: ${testRun.status} → completed (eval: ${completedEval.id})`)

    return apiSuccess({
      reconciled: true,
      previous_status: testRun.status,
      new_status: 'completed',
      evaluation_id: completedEval.id,
    })
  } catch (error) {
    console.error('[test-runs/reconcile] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
