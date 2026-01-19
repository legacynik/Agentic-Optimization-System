/**
 * API Route: /api/personas
 *
 * CRUD operations for personas.
 * - GET: List personas with filtering
 * - POST: Create a new persona
 *
 * @module api/personas
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

/** Valid persona difficulty levels */
type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

/** Valid validation statuses (v2.4: only 2 states) */
type ValidationStatus = 'pending' | 'validated'

/** Create persona request body */
interface CreatePersonaRequest {
  name: string
  description?: string
  psychological_profile?: string
  personaprompt: string
  category?: string
  difficulty?: Difficulty
  behaviors?: string[]
  created_for_prompt?: string
  created_by?: 'ai' | 'human' | 'template'
}

/** Persona response structure */
interface PersonaResponse {
  id: string
  name: string
  description: string | null
  psychological_profile: string | null
  personaprompt: string | null
  personaid: string | null
  category: string | null
  difficulty: string | null
  behaviors: string[] | null
  validation_status: ValidationStatus
  created_for_prompt: string | null
  created_by: string | null
  validated_by_human: boolean
  created_at: string
  updated_at: string
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
// GET Handler - List Personas
// ============================================================================

/**
 * GET /api/personas
 *
 * Lists personas with optional filtering.
 *
 * Query params:
 * - validation_status: Filter by validation status ('pending' | 'validated')
 * - category: Filter by category
 * - difficulty: Filter by difficulty level
 * - created_for_prompt: Filter by prompt they were created for
 * - search: Search by name (partial match)
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const validationStatus = searchParams.get('validation_status')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const createdForPrompt = searchParams.get('created_for_prompt')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
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
        created_for_prompt,
        created_by,
        validated_by_human,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (validationStatus) {
      query = query.eq('validation_status', validationStatus)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (createdForPrompt) {
      query = query.eq('created_for_prompt', createdForPrompt)
    }
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[personas] Error fetching personas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch personas', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0)
      }
    })

  } catch (error) {
    console.error('[personas] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler - Create Persona
// ============================================================================

/**
 * POST /api/personas
 *
 * Creates a new persona.
 *
 * Request body:
 * - name: string (required)
 * - personaprompt: string (required) - The prompt text for the persona
 * - description: string (optional)
 * - psychological_profile: string (optional)
 * - category: string (optional)
 * - difficulty: 'easy' | 'medium' | 'hard' | 'extreme' (optional)
 * - behaviors: string[] (optional)
 * - created_for_prompt: string (optional) - prompt name
 * - created_by: 'ai' | 'human' | 'template' (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreatePersonaRequest = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!body.personaprompt || body.personaprompt.trim() === '') {
      return NextResponse.json(
        { error: 'personaprompt is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate difficulty if provided
    const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme']
    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty. Must be one of: easy, medium, hard, extreme', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Generate legacy personaid if needed
    const personaid = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Create persona
    const { data: persona, error: createError } = await supabase
      .from('personas')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        psychological_profile: body.psychological_profile?.trim() || null,
        personaprompt: body.personaprompt.trim(),
        personaid,
        category: body.category?.trim() || null,
        difficulty: body.difficulty || 'medium',
        behaviors: body.behaviors || null,
        created_for_prompt: body.created_for_prompt?.trim() || null,
        created_by: body.created_by || 'human',
        validation_status: 'pending',
        validated_by_human: false,
        feedback_notes: []
      })
      .select()
      .single()

    if (createError) {
      console.error('[personas] Error creating persona:', createError)
      return NextResponse.json(
        { error: 'Failed to create persona', code: 'INTERNAL_ERROR', details: createError.message },
        { status: 500 }
      )
    }

    console.log(`[personas] Created persona: ${persona.name} (${persona.id})`)

    return NextResponse.json(persona, { status: 201 })

  } catch (error) {
    console.error('[personas] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
