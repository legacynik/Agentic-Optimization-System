/**
 * API Route: /api/prompts/names
 *
 * Returns distinct prompt names from prompt_versions table.
 * Used by AgentSelector to populate the dropdown.
 *
 * @module api/prompts/names
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/prompts/names
 *
 * Returns a list of distinct prompt_name values from prompt_versions.
 *
 * Response:
 * {
 *   names: string[]  // ["Sales Agent", "Support Agent", ...]
 * }
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('prompt_versions')
      .select('prompt_name')

    if (error) {
      console.error('[prompts/names] Error fetching prompt names:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prompt names', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    // Extract distinct prompt names
    const uniqueNames = [...new Set(data?.map(row => row.prompt_name).filter(Boolean))]

    // Sort alphabetically
    uniqueNames.sort((a, b) => a.localeCompare(b))

    console.log(`[prompts/names] Returning ${uniqueNames.length} distinct prompt names`)

    return NextResponse.json({ names: uniqueNames })

  } catch (error) {
    console.error('[prompts/names] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
