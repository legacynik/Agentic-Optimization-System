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
      .not('criteria_scores', 'is', null)

    if (battleError) return apiError('Failed to fetch criteria', 'INTERNAL_ERROR', 500)

    // If latest evaluation has no criteria data, try to find one that does
    if (!battleEvals?.length) {
      const { data: fallbackEvals } = await supabase
        .from('battle_evaluations')
        .select('criteria_scores')
        .not('criteria_scores', 'is', null)
        .limit(50)

      if (!fallbackEvals?.length) return apiSuccess([])
      // Use fallback data
      battleEvals.push(...fallbackEvals)
    }

    // Aggregate criteria scores across all battles
    // criteria_scores is an array of {criteria_name, score, notes}
    const criteriaMap = new Map<string, number[]>()
    for (const be of battleEvals) {
      if (!be.criteria_scores) continue
      const scores = be.criteria_scores as Array<{ criteria_name: string; score: number; notes?: string }>
      if (!Array.isArray(scores)) continue
      for (const entry of scores) {
        if (typeof entry.score !== 'number' || !entry.criteria_name) continue
        if (!criteriaMap.has(entry.criteria_name)) criteriaMap.set(entry.criteria_name, [])
        criteriaMap.get(entry.criteria_name)!.push(entry.score)
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
