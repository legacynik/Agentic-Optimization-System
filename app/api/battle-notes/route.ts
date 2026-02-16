/**
 * API Route: /api/battle-notes
 *
 * CRUD operations for human notes on battle results.
 * Notes are used by the Analyzer workflow for optimization feedback.
 *
 * @module api/battle-notes
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid note categories */
type NoteCategory = 'issue' | 'suggestion' | 'positive' | 'question'

/** Request body for creating a battle note */
interface CreateBattleNoteRequest {
  battle_result_id: string
  note: string
  category: NoteCategory
  created_by?: string
}

/** Battle note response */
interface BattleNoteResponse {
  id: string
  battle_result_id: string
  note: string
  category: NoteCategory
  created_by: string | null
  created_at: string
}

// ============================================================================
// GET Handler - List Battle Notes
// ============================================================================

/**
 * GET /api/battle-notes
 *
 * Lists battle notes with filtering.
 *
 * Query params:
 * - battle_result_id: Filter by specific battle (required or use test_run_id)
 * - test_run_id: Get all notes for a test run
 * - category: Filter by category
 * - limit: Number of results (default 100, max 500)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const battleResultId = searchParams.get('battle_result_id')
    const testRunId = searchParams.get('test_run_id')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // At least one filter is required
    if (!battleResultId && !testRunId) {
      return apiError('Either battle_result_id or test_run_id is required', 'VALIDATION_ERROR', 400)
    }

    // Validate UUIDs
    if (battleResultId && !isValidUUID(battleResultId)) {
      return apiError('Invalid battle_result_id format', 'INVALID_UUID', 400)
    }

    if (testRunId && !isValidUUID(testRunId)) {
      return apiError('Invalid test_run_id format', 'INVALID_UUID', 400)
    }

    // Build query
    let query = supabase
      .from('battle_notes')
      .select(`
        id,
        battle_result_id,
        note,
        category,
        created_by,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (battleResultId) {
      query = query.eq('battle_result_id', battleResultId)
    }

    // For test_run_id, we need to join with battle_results
    if (testRunId && !battleResultId) {
      // First get all battle_result_ids for this test run
      const { data: battleResults, error: battleError } = await supabase
        .from('battle_results')
        .select('id')
        .eq('test_run_id', testRunId)

      if (battleError) {
        return apiError('Failed to fetch battle results', 'INTERNAL_ERROR', 500)
      }

      const battleResultIds = battleResults?.map((br) => br.id) || []

      if (battleResultIds.length === 0) {
        return apiSuccess([], { total: 0, limit, offset, has_more: false })
      }

      query = query.in('battle_result_id', battleResultIds)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[battle-notes] Error fetching notes:', error)
      return apiError('Failed to fetch notes', 'INTERNAL_ERROR', 500, error.message)
    }

    return apiSuccess(data, {
      total: count,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('[battle-notes] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// POST Handler - Create Battle Note
// ============================================================================

/**
 * POST /api/battle-notes
 *
 * Creates a new battle note.
 *
 * Request body:
 * - battle_result_id: string UUID (required)
 * - note: string (required)
 * - category: 'issue' | 'suggestion' | 'positive' | 'question' (required)
 * - created_by: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBattleNoteRequest = await request.json()

    // Validate required fields
    if (!body.battle_result_id) {
      return apiError('battle_result_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(body.battle_result_id)) {
      return apiError('Invalid battle_result_id format', 'INVALID_UUID', 400)
    }

    if (!body.note || body.note.trim() === '') {
      return apiError('note is required', 'VALIDATION_ERROR', 400)
    }

    // Validate category
    const validCategories: NoteCategory[] = ['issue', 'suggestion', 'positive', 'question']
    if (!body.category || !validCategories.includes(body.category)) {
      return apiError('category must be one of: issue, suggestion, positive, question', 'VALIDATION_ERROR', 400)
    }

    // Verify battle_result exists
    const { data: battleResult, error: checkError } = await supabase
      .from('battle_results')
      .select('id, test_run_id')
      .eq('id', body.battle_result_id)
      .single()

    if (checkError || !battleResult) {
      return apiError('Battle result not found', 'NOT_FOUND', 404)
    }

    // Create note
    const { data: note, error: createError } = await supabase
      .from('battle_notes')
      .insert({
        battle_result_id: body.battle_result_id,
        note: body.note.trim(),
        category: body.category,
        created_by: body.created_by || null
      })
      .select()
      .single()

    if (createError) {
      console.error('[battle-notes] Error creating note:', createError)
      return apiError('Failed to create note', 'INTERNAL_ERROR', 500, createError.message)
    }

    console.log(`[battle-notes] Created note for battle ${body.battle_result_id}: ${body.category}`)

    return apiSuccess({
      id: note.id,
      battle_result_id: note.battle_result_id,
      test_run_id: battleResult.test_run_id,
      category: note.category,
      created_at: note.created_at
    }, undefined, 201)

  } catch (error) {
    console.error('[battle-notes] POST error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// DELETE Handler - Delete Battle Note
// ============================================================================

/**
 * DELETE /api/battle-notes
 *
 * Deletes a battle note.
 *
 * Query params:
 * - id: Note ID to delete (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError('id is required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(id)) {
      return apiError('Invalid id format', 'INVALID_UUID', 400)
    }

    // Delete note
    const { error } = await supabase
      .from('battle_notes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[battle-notes] Error deleting note:', error)
      return apiError('Failed to delete note', 'INTERNAL_ERROR', 500, error.message)
    }

    console.log(`[battle-notes] Deleted note: ${id}`)

    return apiSuccess({ message: 'Note deleted' })

  } catch (error) {
    console.error('[battle-notes] DELETE error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
