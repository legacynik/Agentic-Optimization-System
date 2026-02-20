/**
 * API Route: /api/evaluations
 *
 * Retrieve evaluations for test runs.
 * - GET: List evaluations for a test run
 *
 * @module api/evaluations
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid evaluation statuses */
type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed'

/** Evaluation response structure */
interface EvaluationResponse {
  id: string
  test_run_id: string
  evaluator_config_id: string
  evaluator_name: string
  evaluator_version: string
  status: EvaluationStatus
  is_promoted: boolean
  overall_score: number | null
  success_count: number
  failure_count: number
  partial_count: number
  battles_evaluated: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  triggered_by: string | null
  error_message: string | null
}

// ============================================================================
// GET Handler - List Evaluations for Test Run
// ============================================================================

/**
 * GET /api/evaluations
 *
 * Retrieves all evaluations for a specific test run.
 *
 * Query params:
 * - test_run_id: UUID (REQUIRED) - The test run to fetch evaluations for
 *
 * Returns evaluations with:
 * - Evaluator config details (name, version)
 * - Battle evaluations count
 * - All status and score fields
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate test_run_id
    const testRunId = searchParams.get('test_run_id')

    if (!testRunId) {
      return apiError('test_run_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(testRunId)) {
      return apiError('Invalid test_run_id format', 'VALIDATION_ERROR', 400)
    }

    // Fetch evaluations with evaluator_config join
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('evaluations')
      .select(`
        id,
        test_run_id,
        evaluator_config_id,
        status,
        is_promoted,
        overall_score,
        success_count,
        failure_count,
        partial_count,
        model_used,
        started_at,
        completed_at,
        created_at,
        triggered_by,
        error_message,
        evaluator_configs!inner(name, version)
      `)
      .eq('test_run_id', testRunId)
      .order('created_at', { ascending: false })

    if (evaluationsError) {
      console.error('[evaluations] Error fetching evaluations:', evaluationsError)
      return apiError('Failed to fetch evaluations', 'INTERNAL_ERROR', 500)
    }

    // Get battle_evaluations counts for each evaluation
    const evaluationIds = evaluations?.map(e => e.id) || []
    let battleCounts: Record<string, number> = {}

    if (evaluationIds.length > 0) {
      const { data: battleData, error: battleError } = await supabase
        .from('battle_evaluations')
        .select('evaluation_id')
        .in('evaluation_id', evaluationIds)

      if (!battleError && battleData) {
        // Count battles per evaluation
        battleCounts = battleData.reduce((acc, battle) => {
          acc[battle.evaluation_id] = (acc[battle.evaluation_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Transform data to flatten evaluator_config details and add battle count
    const transformedData: EvaluationResponse[] = evaluations?.map((evaluation: any) => ({
      id: evaluation.id,
      test_run_id: evaluation.test_run_id,
      evaluator_config_id: evaluation.evaluator_config_id,
      evaluator_name: evaluation.evaluator_configs?.name || null,
      evaluator_version: evaluation.evaluator_configs?.version || null,
      status: evaluation.status,
      is_promoted: evaluation.is_promoted,
      overall_score: evaluation.overall_score,
      success_count: evaluation.success_count,
      failure_count: evaluation.failure_count,
      partial_count: evaluation.partial_count,
      battles_evaluated: battleCounts[evaluation.id] || 0,
      started_at: evaluation.started_at,
      completed_at: evaluation.completed_at,
      created_at: evaluation.created_at,
      triggered_by: evaluation.triggered_by,
      error_message: evaluation.error_message
    })) || []

    return apiSuccess(transformedData)

  } catch (error) {
    console.error('[evaluations] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
