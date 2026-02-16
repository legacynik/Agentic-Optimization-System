/**
 * API Route: /api/prompt-personas
 *
 * Manages the many-to-many relationship between personas and prompts.
 * - GET: List associations with filtering
 * - POST: Create a new association
 * - DELETE: Remove an association (via query params)
 *
 * @module api/prompt-personas
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Request body for creating an association */
interface CreateAssociationRequest {
  persona_id: string
  prompt_name: string
  priority?: number
  is_active?: boolean
}

/** Association response with persona details */
interface AssociationWithPersona {
  persona_id: string
  prompt_name: string
  is_active: boolean
  priority: number
  created_at: string
  persona: {
    name: string
    category: string | null
    difficulty: string | null
    validation_status: string
  }
}

// ============================================================================
// GET Handler - List Associations
// ============================================================================

/**
 * GET /api/prompt-personas
 *
 * Lists prompt-persona associations with optional filtering.
 *
 * Query params:
 * - prompt_name: Filter by prompt name (required or use persona_id)
 * - persona_id: Filter by persona ID (required or use prompt_name)
 * - is_active: Filter by active status ('true' or 'false')
 * - include_unvalidated: Include personas with validation_status='pending' ('true' or 'false', default 'false')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const promptName = searchParams.get('prompt_name')
    const personaId = searchParams.get('persona_id')
    const isActive = searchParams.get('is_active')
    const includeUnvalidated = searchParams.get('include_unvalidated') === 'true'

    // At least one filter is required
    if (!promptName && !personaId) {
      return apiError('Either prompt_name or persona_id is required', 'VALIDATION_ERROR', 400)
    }

    // Validate persona_id if provided
    if (personaId && !isValidUUID(personaId)) {
      return apiError('Invalid persona_id format', 'INVALID_UUID', 400)
    }

    // Build query
    let query = supabase
      .from('prompt_personas')
      .select(`
        persona_id,
        prompt_name,
        is_active,
        priority,
        created_at,
        personas (
          name,
          category,
          difficulty,
          validation_status
        )
      `)
      .order('priority', { ascending: true })

    // Apply filters
    if (promptName) {
      query = query.eq('prompt_name', promptName)
    }
    if (personaId) {
      query = query.eq('persona_id', personaId)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('[prompt-personas] Error fetching associations:', error)
      return apiError('Failed to fetch associations', 'INTERNAL_ERROR', 500, error.message)
    }

    // Define persona type from query
    type PersonaData = {
      name: string
      category: string | null
      difficulty: string | null
      validation_status: string
    }

    // Filter out unvalidated personas unless explicitly requested
    let filteredData = data || []
    if (!includeUnvalidated) {
      filteredData = filteredData.filter((item) => {
        const persona = item.personas as PersonaData | PersonaData[] | null
        const personaObj = Array.isArray(persona) ? persona[0] : persona
        return personaObj?.validation_status === 'validated'
      })
    }

    // Format response
    const associations: AssociationWithPersona[] = filteredData.map((item) => {
      const persona = item.personas as PersonaData | PersonaData[] | null
      const personaObj = Array.isArray(persona) ? persona[0] : persona

      return {
        persona_id: item.persona_id,
        prompt_name: item.prompt_name,
        is_active: item.is_active,
        priority: item.priority,
        created_at: item.created_at,
        persona: {
          name: personaObj?.name || 'Unknown',
          category: personaObj?.category || null,
          difficulty: personaObj?.difficulty || null,
          validation_status: personaObj?.validation_status || 'unknown'
        }
      }
    })

    return apiSuccess({
      associations,
      total: associations.length,
      prompt_name: promptName,
      persona_id: personaId
    })

  } catch (error) {
    console.error('[prompt-personas] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// POST Handler - Create Association
// ============================================================================

/**
 * POST /api/prompt-personas
 *
 * Creates a new persona-prompt association.
 *
 * Request body:
 * - persona_id: string UUID (required)
 * - prompt_name: string (required) - Must exist in prompt_versions
 * - priority: number (optional, default 0)
 * - is_active: boolean (optional, default true)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateAssociationRequest = await request.json()

    // Validate required fields
    if (!body.persona_id) {
      return apiError('persona_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(body.persona_id)) {
      return apiError('Invalid persona_id format', 'INVALID_UUID', 400)
    }

    if (!body.prompt_name || body.prompt_name.trim() === '') {
      return apiError('prompt_name is required', 'VALIDATION_ERROR', 400)
    }

    // Verify persona exists
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('id, name')
      .eq('id', body.persona_id)
      .single()

    if (personaError || !persona) {
      return apiError('Persona not found', 'NOT_FOUND', 404)
    }

    // Verify prompt_name exists in prompt_versions
    const { data: promptVersion, error: promptError } = await supabase
      .from('prompt_versions')
      .select('prompt_name')
      .eq('prompt_name', body.prompt_name.trim())
      .limit(1)
      .single()

    if (promptError || !promptVersion) {
      return apiError('Prompt name not found in prompt_versions', 'NOT_FOUND', 404)
    }

    // Create association
    const { data: association, error: createError } = await supabase
      .from('prompt_personas')
      .insert({
        persona_id: body.persona_id,
        prompt_name: body.prompt_name.trim(),
        priority: body.priority ?? 0,
        is_active: body.is_active ?? true
      })
      .select()
      .single()

    if (createError) {
      // Check if it's a duplicate key error
      if (createError.code === '23505') {
        return apiError('Association already exists', 'VALIDATION_ERROR', 409)
      }

      console.error('[prompt-personas] Error creating association:', createError)
      return apiError('Failed to create association', 'INTERNAL_ERROR', 500, createError.message)
    }

    console.log(`[prompt-personas] Created association: ${persona.name} -> ${body.prompt_name}`)

    return apiSuccess({
      persona_id: association.persona_id,
      persona_name: persona.name,
      prompt_name: association.prompt_name,
      priority: association.priority,
      is_active: association.is_active
    }, undefined, 201)

  } catch (error) {
    console.error('[prompt-personas] POST error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// DELETE Handler - Remove Association
// ============================================================================

/**
 * DELETE /api/prompt-personas
 *
 * Removes a persona-prompt association.
 *
 * Query params:
 * - persona_id: string UUID (required)
 * - prompt_name: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const personaId = searchParams.get('persona_id')
    const promptName = searchParams.get('prompt_name')

    // Validate required params
    if (!personaId || !promptName) {
      return apiError('Both persona_id and prompt_name are required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(personaId)) {
      return apiError('Invalid persona_id format', 'INVALID_UUID', 400)
    }

    // Delete association
    const { error } = await supabase
      .from('prompt_personas')
      .delete()
      .eq('persona_id', personaId)
      .eq('prompt_name', promptName)

    if (error) {
      console.error('[prompt-personas] Error deleting association:', error)
      return apiError('Failed to delete association', 'INTERNAL_ERROR', 500, error.message)
    }

    console.log(`[prompt-personas] Deleted association: ${personaId} -> ${promptName}`)

    return apiSuccess({
      message: 'Association removed',
      persona_id: personaId,
      prompt_name: promptName
    })

  } catch (error) {
    console.error('[prompt-personas] DELETE error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// PATCH Handler - Update Association
// ============================================================================

/**
 * PATCH /api/prompt-personas
 *
 * Updates an existing association (priority, is_active).
 *
 * Query params:
 * - persona_id: string UUID (required)
 * - prompt_name: string (required)
 *
 * Request body:
 * - priority: number (optional)
 * - is_active: boolean (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json()

    const personaId = searchParams.get('persona_id')
    const promptName = searchParams.get('prompt_name')

    // Validate required params
    if (!personaId || !promptName) {
      return apiError('Both persona_id and prompt_name are required', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(personaId)) {
      return apiError('Invalid persona_id format', 'INVALID_UUID', 400)
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.priority !== undefined) {
      updateData.priority = body.priority
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid fields to update', 'VALIDATION_ERROR', 400)
    }

    // Update association
    const { data, error } = await supabase
      .from('prompt_personas')
      .update(updateData)
      .eq('persona_id', personaId)
      .eq('prompt_name', promptName)
      .select()
      .single()

    if (error) {
      console.error('[prompt-personas] Error updating association:', error)
      return apiError('Failed to update association', 'INTERNAL_ERROR', 500, error.message)
    }

    if (!data) {
      return apiError('Association not found', 'NOT_FOUND', 404)
    }

    console.log(`[prompt-personas] Updated association: ${personaId} -> ${promptName}`)

    return apiSuccess({
      persona_id: data.persona_id,
      prompt_name: data.prompt_name,
      priority: data.priority,
      is_active: data.is_active
    })

  } catch (error) {
    console.error('[prompt-personas] PATCH error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
