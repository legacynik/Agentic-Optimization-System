/**
 * Dashboard Stats Route
 *
 * Aggregates test run metrics including:
 * - Total test runs count
 * - Average overall score
 * - Success rate
 * - Average turns per battle
 *
 * GET /api/dashboard/stats
 */

import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    // Fetch all test runs with key metrics
    const { data: runs, error } = await supabase
      .from('test_runs')
      .select('id, overall_score, success_count, failure_count, timeout_count')
      .limit(10000)

    if (error) return apiError('Failed to fetch stats', 'INTERNAL_ERROR', 500)

    const totalRuns = runs?.length || 0
    const completedRuns = runs?.filter(r => r.overall_score !== null) || []
    const avgScore = completedRuns.length > 0
      ? completedRuns.reduce((sum, r) => sum + (r.overall_score || 0), 0) / completedRuns.length
      : null

    // Calculate success rate across all battles
    const totalSuccess = runs?.reduce((sum, r) => sum + (r.success_count || 0), 0) || 0
    const totalBattles = runs?.reduce((sum, r) =>
      sum + (r.success_count || 0) + (r.failure_count || 0) + (r.timeout_count || 0), 0) || 0
    const successRate = totalBattles > 0 ? (totalSuccess / totalBattles) * 100 : 0

    // Calculate average turns per battle
    const { data: battles } = await supabase
      .from('battle_results')
      .select('turns')
      .limit(10000)

    const avgTurns = battles && battles.length > 0
      ? battles.reduce((sum, b) => sum + (b.turns || 0), 0) / battles.length
      : 0

    return apiSuccess({
      totalRuns,
      avgScore: avgScore ? Math.round(avgScore * 100) / 100 : 0,
      successRate: Math.round(successRate * 100) / 100,
      avgTurns: Math.round(avgTurns * 100) / 100,
    })
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
