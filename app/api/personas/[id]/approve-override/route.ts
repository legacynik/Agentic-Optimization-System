/**
 * API Route: /api/personas/[id]/approve-override
 *
 * Manually overrides a rejected persona's validation status.
 * - POST: Set persona status to 'approved_override'
 *
 * @module api/personas/[id]/approve-override
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

/**
 * POST /api/personas/[id]/approve-override
 *
 * Sets a rejected persona's status to 'approved_override', making it
 * eligible for test runs despite failing automated validation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid persona ID format', 'VALIDATION_ERROR', 400)
    }

    // Verify persona exists and is rejected
    const { data: persona, error: fetchError } = await supabase
      .from('personas')
      .select('id, name, validation_status')
      .eq('id', id)
      .single()

    if (fetchError || !persona) {
      return apiError('Persona not found', 'NOT_FOUND', 404)
    }

    if (persona.validation_status !== 'rejected') {
      return apiError(
        `Cannot override persona with status '${persona.validation_status}'. Only rejected personas can be overridden.`,
        'INVALID_STATUS',
        400
      )
    }

    // Set to approved_override
    const { data: updated, error: updateError } = await supabase
      .from('personas')
      .update({ validation_status: 'approved_override' })
      .eq('id', id)
      .select('id, name, validation_status, validation_score, rejection_reason')
      .single()

    if (updateError) {
      console.error('[personas/approve-override] Failed to update:', updateError)
      return apiError('Failed to override persona', 'INTERNAL_ERROR', 500)
    }

    console.log(`[personas/approve-override] Persona ${id} (${persona.name}) overridden`)

    return apiSuccess({
      ...updated,
      message: 'Persona approved via manual override. It is now eligible for test runs.',
    })
  } catch (error) {
    console.error('[personas/approve-override] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
