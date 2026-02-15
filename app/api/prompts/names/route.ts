/**
 * API Route: /api/prompts/names
 *
 * Returns list of prompts with id and prompt_name for dropdown selection.
 *
 * @module api/prompts/names
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      return NextResponse.json(
        { error: 'Failed to fetch prompts', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    // Transform prompt_name to name for consistent API response
    const transformed: PromptName[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.prompt_name
    }))

    return NextResponse.json({ data: transformed })
  } catch (error) {
    console.error('[prompts/names] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
