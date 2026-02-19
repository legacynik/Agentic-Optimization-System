/**
 * API Route: /api/prompt-versions/[id]
 *
 * Operations for a single prompt version.
 * - GET: Fetch prompt version details
 * - PATCH: Update prompt version fields
 *
 * @module api/prompt-versions/[id]
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// GET Handler
// ============================================================================

/**
 * GET /api/prompt-versions/[id]
 *
 * Fetches a single prompt version by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid prompt version ID format', 'INVALID_UUID', 400)
    }

    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return apiError('Prompt version not found', 'NOT_FOUND', 404)
    }

    return apiSuccess(data)

  } catch (error) {
    console.error('[prompt-versions/id] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// PATCH Handler
// ============================================================================

/**
 * PATCH /api/prompt-versions/[id]
 *
 * Updates a prompt version's fields.
 *
 * Updatable fields:
 * - content, optimization_notes, business_type, status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!isValidUUID(id)) {
      return apiError('Invalid prompt version ID format', 'INVALID_UUID', 400)
    }

    const allowedFields = [
      'content', 'optimization_notes', 'business_type', 'status'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = typeof body[field] === 'string'
          ? body[field].trim()
          : body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 'VALIDATION_ERROR', 400)
    }

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('prompt_versions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[prompt-versions/id] Error updating:', error)
      return apiError('Failed to update prompt version', 'INTERNAL_ERROR', 500, error.message)
    }

    if (!data) {
      return apiError('Prompt version not found', 'NOT_FOUND', 404)
    }

    console.log(`[prompt-versions/id] Updated: ${data.prompt_name} v${data.version} (${data.id})`)

    return apiSuccess(data)

  } catch (error) {
    console.error('[prompt-versions/id] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// DELETE Handler
// ============================================================================

/**
 * DELETE /api/prompt-versions/[id]
 *
 * Deletes a prompt version. Only drafts can be deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return apiError('Invalid prompt version ID format', 'INVALID_UUID', 400)
    }

    // Atomic delete: status guard in the same query to prevent TOCTOU race
    const { data: deleted, error: deleteError } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')
      .select('id, prompt_name, version')
      .single()

    if (deleteError || !deleted) {
      // Could be not found OR not a draft — check which
      const { data: existing } = await supabase
        .from('prompt_versions')
        .select('id, status')
        .eq('id', id)
        .single()

      if (!existing) {
        return apiError('Prompt version not found', 'NOT_FOUND', 404)
      }
      return apiError('Only draft versions can be deleted', 'NOT_DRAFT', 400)
    }

    console.log(`[prompt-versions/id] Deleted draft: ${deleted.prompt_name} ${deleted.version} (${id})`)

    return apiSuccess({ deleted: true, id })

  } catch (error) {
    console.error('[prompt-versions/id] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
