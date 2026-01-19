/**
 * API Route: /api/personas/[id]/feedback
 *
 * Add feedback notes to a persona.
 * Feedback is used by the Personas Validator to improve personas.
 *
 * @module api/personas/[id]/feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Type Definitions
// ============================================================================

/** Feedback note stored in personas.feedback_notes */
interface FeedbackNote {
  note: string
  category?: 'behavior' | 'difficulty' | 'realism' | 'other'
  from_test_run_id?: string
  from_battle_result_id?: string
  created_at: string
}

/** Request body for adding feedback */
interface AddFeedbackRequest {
  note: string
  category?: 'behavior' | 'difficulty' | 'realism' | 'other'
  from_battle_result_id?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// ============================================================================
// GET Handler - List Feedback
// ============================================================================

/**
 * GET /api/personas/[id]/feedback
 *
 * Lists all feedback notes for a persona.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid persona ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Fetch persona with feedback_notes
    const { data: persona, error } = await supabase
      .from('personas')
      .select('id, name, feedback_notes, validation_status')
      .eq('id', id)
      .single()

    if (error || !persona) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      persona_id: persona.id,
      persona_name: persona.name,
      validation_status: persona.validation_status,
      feedback_notes: persona.feedback_notes || [],
      feedback_count: (persona.feedback_notes || []).length
    })

  } catch (error) {
    console.error('[personas/feedback] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler - Add Feedback
// ============================================================================

/**
 * POST /api/personas/[id]/feedback
 *
 * Adds a feedback note to a persona.
 * Per PRD: Feedback is used by Personas Validator for improvement.
 *
 * Request body:
 * - note: string (required)
 * - category: 'behavior' | 'difficulty' | 'realism' | 'other' (optional)
 * - from_battle_result_id: string UUID (optional) - Link to specific battle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: AddFeedbackRequest = await request.json()

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid persona ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.note || body.note.trim() === '') {
      return NextResponse.json(
        { error: 'note is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate category if provided
    const validCategories = ['behavior', 'difficulty', 'realism', 'other']
    if (body.category && !validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate from_battle_result_id if provided
    if (body.from_battle_result_id && !isValidUUID(body.from_battle_result_id)) {
      return NextResponse.json(
        { error: 'Invalid from_battle_result_id format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Fetch current persona
    const { data: persona, error: fetchError } = await supabase
      .from('personas')
      .select('id, name, feedback_notes, validation_status')
      .eq('id', id)
      .single()

    if (fetchError || !persona) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // If from_battle_result_id provided, get the test_run_id
    let testRunId: string | undefined
    if (body.from_battle_result_id) {
      const { data: battleResult } = await supabase
        .from('battle_results')
        .select('test_run_id')
        .eq('id', body.from_battle_result_id)
        .single()

      testRunId = battleResult?.test_run_id
    }

    // Create new feedback note
    const newFeedback: FeedbackNote = {
      note: body.note.trim(),
      category: body.category,
      from_test_run_id: testRunId,
      from_battle_result_id: body.from_battle_result_id,
      created_at: new Date().toISOString()
    }

    // Append to existing feedback_notes
    const existingNotes: FeedbackNote[] = persona.feedback_notes || []
    const updatedNotes = [...existingNotes, newFeedback]

    // Update persona
    const { error: updateError } = await supabase
      .from('personas')
      .update({
        feedback_notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[personas/feedback] Error adding feedback:', updateError)
      return NextResponse.json(
        { error: 'Failed to add feedback', code: 'INTERNAL_ERROR', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[personas/feedback] Added feedback to persona: ${persona.name} (${persona.id})`)

    return NextResponse.json({
      success: true,
      persona_id: persona.id,
      persona_name: persona.name,
      feedback_count: updatedNotes.length,
      validation_status: persona.validation_status
    }, { status: 201 })

  } catch (error) {
    console.error('[personas/feedback] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE Handler - Clear Feedback
// ============================================================================

/**
 * DELETE /api/personas/[id]/feedback
 *
 * Clears all feedback notes for a persona.
 * Use with caution - this is permanent.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid persona ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Clear feedback_notes
    const { data, error } = await supabase
      .from('personas')
      .update({
        feedback_notes: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name')
      .single()

    if (error) {
      console.error('[personas/feedback] Error clearing feedback:', error)
      return NextResponse.json(
        { error: 'Failed to clear feedback', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log(`[personas/feedback] Cleared feedback for persona: ${data.name} (${data.id})`)

    return NextResponse.json({
      success: true,
      persona_id: data.id,
      persona_name: data.name,
      message: 'All feedback cleared'
    })

  } catch (error) {
    console.error('[personas/feedback] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
