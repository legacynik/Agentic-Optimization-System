/**
 * API Route: /api/prompt-versions
 *
 * CRUD operations for prompt versions.
 * - GET: List prompt versions with filtering
 * - POST: Create new prompt version
 *
 * @module api/prompt-versions
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

// ============================================================================
// GET Handler - List Prompt Versions
// ============================================================================

/**
 * GET /api/prompt-versions
 *
 * Lists prompt versions with optional filtering.
 *
 * Query params:
 * - prompt_name: Filter by prompt name (exact match)
 * - status: Filter by status ('draft' | 'active' | 'archived')
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const promptName = searchParams.get('prompt_name')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('prompt_versions')
      .select(`
        id,
        prompt_name,
        version,
        content,
        optimization_notes,
        business_type,
        status,
        legacy_promptversionid,
        created_from,
        avg_success_rate,
        avg_score,
        avg_turns,
        total_test_runs,
        prompt_id,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (promptName) {
      query = query.eq('prompt_name', promptName)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[prompt-versions] Error fetching:', error)
      return apiError('Failed to fetch prompt versions', 'INTERNAL_ERROR', 500, error.message)
    }

    return apiSuccess(data, {
      total: count,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('[prompt-versions] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// POST Handler - Create Prompt Version
// ============================================================================

/**
 * POST /api/prompt-versions
 *
 * Creates a new prompt version.
 *
 * Request body:
 * - prompt_name: string (required)
 * - version: string (required)
 * - content: string (required)
 * - optimization_notes: string (optional)
 * - business_type: string (optional)
 * - status: string (optional, default 'draft')
 * - created_from: UUID (optional, parent version)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.prompt_name || body.prompt_name.trim() === '') {
      return apiError('prompt_name is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.version || body.version.trim() === '') {
      return apiError('version is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.content || body.content.trim() === '') {
      return apiError('content is required', 'VALIDATION_ERROR', 400)
    }

    // Check for duplicate prompt_name + version
    const { data: existing } = await supabase
      .from('prompt_versions')
      .select('id')
      .eq('prompt_name', body.prompt_name.trim())
      .eq('version', body.version.trim())
      .single()

    if (existing) {
      return apiError(
        'A prompt version with this name and version already exists',
        'DUPLICATE',
        409
      )
    }

    // Look up prompt_id from prompts table if exists
    let promptId = null
    const { data: prompt } = await supabase
      .from('prompts')
      .select('id')
      .eq('prompt_name', body.prompt_name.trim())
      .single()
    if (prompt) {
      promptId = prompt.id
    }

    const { data, error } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_name: body.prompt_name.trim(),
        version: body.version.trim(),
        content: body.content.trim(),
        optimization_notes: body.optimization_notes?.trim() || null,
        business_type: body.business_type?.trim() || null,
        status: body.status || 'draft',
        created_from: body.created_from || null,
        prompt_id: promptId
      })
      .select()
      .single()

    if (error) {
      console.error('[prompt-versions] Error creating:', error)
      return apiError('Failed to create prompt version', 'INTERNAL_ERROR', 500, error.message)
    }

    console.log(`[prompt-versions] Created: ${data.prompt_name} v${data.version} (${data.id})`)

    return apiSuccess(data, undefined, 201)

  } catch (error) {
    console.error('[prompt-versions] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
