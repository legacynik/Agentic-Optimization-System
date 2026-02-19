/**
 * Dashboard Criteria Route
 *
 * Returns aggregated evaluation criteria scores from the latest evaluation run.
 * Computes average scores for each criterion across all battle evaluations.
 *
 * GET /api/dashboard/criteria
 */

import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    // Get the most recent completed evaluation (promoted or latest)
    const { data: latestEval, error: evalError } = await supabase
      .from('evaluations')
      .select('id')
      .eq('status', 'completed')
      .order('is_promoted', { ascending: false })
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (evalError && evalError.code !== 'PGRST116') {
      return apiError('Failed to fetch latest evaluation', 'INTERNAL_ERROR', 500)
    }

    if (!latestEval) {
      return apiSuccess([])
    }

    // Fetch all battle evaluations for this evaluation run
    const { data: battleEvals, error: battleError } = await supabase
      .from('battle_evaluations')
      .select('criteria_scores')
      .eq('evaluation_id', latestEval.id)

    if (battleError) return apiError('Failed to fetch criteria', 'INTERNAL_ERROR', 500)
    if (!battleEvals?.length) return apiSuccess([])

    // Aggregate criteria scores across all battles
    const criteriaMap = new Map<string, number[]>()
    for (const be of battleEvals) {
      if (!be.criteria_scores) continue
      const scores = be.criteria_scores as Record<string, number>
      for (const [name, score] of Object.entries(scores)) {
        if (typeof score !== 'number') continue
        if (!criteriaMap.has(name)) criteriaMap.set(name, [])
        criteriaMap.get(name)!.push(score)
      }
    }

    // Compute averages
    const result = Array.from(criteriaMap.entries())
      .map(([name, scores]) => ({
        name,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      }))
      .sort((a, b) => b.avgScore - a.avgScore) // Sort by score descending

    return apiSuccess(result)
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
