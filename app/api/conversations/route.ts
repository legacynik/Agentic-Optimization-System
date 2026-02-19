/**
 * GET /api/conversations
 *
 * Queries battle_results with joins to personas and test_runs.
 * Supports filtering by test_run_id, persona_id, outcome, and pagination.
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testRunId = searchParams.get('test_run_id')
    const personaId = searchParams.get('persona_id')
    const outcome = searchParams.get('outcome')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('battle_results')
      .select(`
        id, test_run_id, persona_id, outcome, score, turns, transcript, created_at,
        personas!inner(name, category),
        test_runs!inner(test_run_code)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (testRunId) query = query.eq('test_run_id', testRunId)
    if (personaId) query = query.eq('persona_id', personaId)
    if (outcome) query = query.eq('outcome', outcome)

    const { data, error, count } = await query

    if (error) return apiError('Failed to fetch conversations', 'INTERNAL_ERROR', 500)

    const formatted = (data || []).map((b: any) => {
      const persona = Array.isArray(b.personas) ? b.personas[0] : b.personas
      const testRun = Array.isArray(b.test_runs) ? b.test_runs[0] : b.test_runs
      return {
        id: b.id,
        test_run_id: b.test_run_id,
        test_run_code: testRun?.test_run_code || 'Unknown',
        persona_id: b.persona_id,
        persona_name: persona?.name || 'Unknown',
        persona_category: persona?.category || 'Unknown',
        outcome: b.outcome,
        score: b.score,
        turns: b.turns,
        transcript: b.transcript,
        created_at: b.created_at,
      }
    })

    return apiSuccess(formatted, {
      total: count,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    })
  } catch {
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
