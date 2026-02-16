/**
 * API Route: /api/prompts/names
 *
 * Returns list of prompts with id and prompt_name for dropdown selection.
 *
 * @module api/prompts/names
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

interface PromptName {
  id: string
  name: string
}

/**
 * GET /api/prompts/names
 *
 * Returns list of available prompts with id and name.
 *
 * Query params:
 * - limit: Maximum number of prompts to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const { data, error } = await supabase
      .from('prompts')
      .select('id, prompt_name')
      .order('prompt_name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[prompts/names] Error fetching prompts:', error)
      return apiError('Failed to fetch prompts', 'INTERNAL_ERROR', 500, error.message)
    }

    // Transform prompt_name to name for consistent API response
    const transformed: PromptName[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.prompt_name
    }))

    return apiSuccess(transformed)
  } catch (error) {
    console.error('[prompts/names] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
