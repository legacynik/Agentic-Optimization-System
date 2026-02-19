/**
 * Dashboard Trend Route
 *
 * Returns historical trend data for test run scores over time.
 * Useful for visualizing performance trends across all test runs.
 *
 * GET /api/dashboard/trend
 */

import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET() {
  try {
    // Fetch completed test runs ordered by date
    const { data, error } = await supabase
      .from('test_runs')
      .select('test_run_code, overall_score, started_at')
      .not('overall_score', 'is', null)
      .order('started_at', { ascending: true })

    if (error) return apiError('Failed to fetch trend', 'INTERNAL_ERROR', 500)

    // Transform to chart-ready format
    const trend = (data || []).map(r => ({
      date: new Date(r.started_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      score: r.overall_score,
      testRunCode: r.test_run_code,
    }))

    return apiSuccess(trend)
  } catch (error) {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
