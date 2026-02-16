/**
 * API Route: /api/prompts/names
 *
 * Returns distinct prompt names from prompt_versions for dropdown selection.
 *
 * @module api/prompts/names
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

/**
 * GET /api/prompts/names
 *
 * Returns distinct prompt_name values from prompt_versions table.
 *
 * Query params:
 * - limit: Maximum number of prompts to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const { data, error } = await supabase
      .from('prompt_versions')
      .select('id, prompt_name')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[prompts/names] Error fetching prompt names:', error)
      return apiError('Failed to fetch prompt names', 'INTERNAL_ERROR', 500, error.message)
    }

    // Deduplicate by prompt_name, keeping the most recent version's UUID
    const seen = new Set<string>()
    const unique: { id: string; name: string }[] = []

    for (const row of data || []) {
      if (!seen.has(row.prompt_name)) {
        seen.add(row.prompt_name)
        unique.push({ id: row.id, name: row.prompt_name })
      }
    }

    return apiSuccess(unique)
  } catch (error) {
    console.error('[prompts/names] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
