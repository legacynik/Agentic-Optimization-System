/**
 * API Route: /api/personas/[id]
 *
 * Operations for a single persona.
 * - GET: Fetch persona details
 * - PATCH: Update persona
 * - DELETE: Delete persona
 *
 * @module api/personas/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
// GET Handler - Get Persona Details
// ============================================================================

/**
 * GET /api/personas/[id]
 *
 * Fetches a single persona with associated prompts and battle stats.
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

    // Fetch persona
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select(`
        id,
        name,
        description,
        psychological_profile,
        personaprompt,
        personaid,
        category,
        difficulty,
        behaviors,
        validation_status,
        feedback_notes,
        created_for_prompt,
        created_by,
        validated_by_human,
        validation_notes,
        validation_prompt_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (personaError || !persona) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Fetch associated prompts
    const { data: promptAssociations } = await supabase
      .from('prompt_personas')
      .select('prompt_name, is_active, priority')
      .eq('persona_id', id)

    // Fetch battle stats
    const { data: battleStats } = await supabase
      .from('battle_results')
      .select('outcome, score')
      .eq('persona_id', id)

    // Calculate stats
    const stats = {
      total_battles: battleStats?.length || 0,
      success_count: battleStats?.filter(b => b.outcome === 'success').length || 0,
      failure_count: battleStats?.filter(b => ['failure', 'tool_error'].includes(b.outcome)).length || 0,
      average_score: battleStats && battleStats.length > 0
        ? battleStats.filter(b => b.score !== null).reduce((sum, b) => sum + (b.score || 0), 0) / battleStats.filter(b => b.score !== null).length
        : null
    }

    return NextResponse.json({
      ...persona,
      associated_prompts: promptAssociations || [],
      stats
    })

  } catch (error) {
    console.error('[personas/id] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH Handler - Update Persona
// ============================================================================

/**
 * PATCH /api/personas/[id]
 *
 * Updates a persona's fields.
 *
 * Updatable fields:
 * - name, description, psychological_profile, personaprompt
 * - category, difficulty, behaviors
 * - validation_status (admin only)
 * - validation_notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid persona ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Define allowed update fields
    const allowedFields = [
      'name', 'description', 'psychological_profile', 'personaprompt',
      'category', 'difficulty', 'behaviors',
      'validation_status', 'validation_notes', 'validated_by_human',
      'created_for_prompt'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate difficulty if provided
    if (updateData.difficulty) {
      const validDifficulties = ['easy', 'medium', 'hard', 'extreme']
      if (!validDifficulties.includes(updateData.difficulty as string)) {
        return NextResponse.json(
          { error: 'Invalid difficulty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Validate validation_status if provided (v2.4: only 2 states)
    if (updateData.validation_status) {
      const validStatuses = ['pending', 'validated']
      if (!validStatuses.includes(updateData.validation_status as string)) {
        return NextResponse.json(
          { error: 'Invalid validation_status. Must be "pending" or "validated"', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('personas')
      .update(updateData)
      .eq('id', id)
      .select('id, name')
      .single()

    if (error) {
      console.error('[personas/id] Error updating persona:', error)
      return NextResponse.json(
        { error: 'Failed to update persona', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log(`[personas/id] Updated persona: ${data.name} (${data.id})`)

    return NextResponse.json({ success: true, id: data.id, name: data.name })

  } catch (error) {
    console.error('[personas/id] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE Handler - Delete Persona
// ============================================================================

/**
 * DELETE /api/personas/[id]
 *
 * Deletes a persona. Also removes all prompt_personas associations.
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

    // Check if persona exists
    const { data: persona, error: checkError } = await supabase
      .from('personas')
      .select('id, name')
      .eq('id', id)
      .single()

    if (checkError || !persona) {
      return NextResponse.json(
        { error: 'Persona not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Delete persona (cascade will delete prompt_personas associations)
    const { error: deleteError } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[personas/id] Error deleting persona:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete persona', code: 'INTERNAL_ERROR', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`[personas/id] Deleted persona: ${persona.name} (${persona.id})`)

    return NextResponse.json({ success: true, message: 'Persona deleted' })

  } catch (error) {
    console.error('[personas/id] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
