/**
 * API Route: /api/test-runs/[id]
 *
 * Operations for a single test run.
 * - GET: Fetch test run details with battle results
 * - PATCH: Update test run (status, notes, etc.)
 * - DELETE: Delete test run (admin only)
 *
 * @module api/test-runs/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Type Definitions
// ============================================================================

/** Battle result summary for API response */
interface BattleResultSummary {
  id: string
  persona_id: string
  persona_name: string
  persona_category: string
  outcome: 'success' | 'partial' | 'failure' | 'timeout' | 'tool_error'
  score: number | null
  turns: number
  has_notes: boolean
  created_at: string
}

/** Full test run response with battle results */
interface TestRunDetailResponse {
  id: string
  test_run_code: string
  prompt_version_id: string
  prompt_name: string
  prompt_version: string
  mode: 'single' | 'full_cycle_with_review'
  status: string
  current_iteration: number
  max_iterations: number
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  tool_scenario_id: string | null
  awaiting_review: boolean
  last_heartbeat_at: string
  started_at: string
  completed_at: string | null
  stopped_reason: string | null
  battle_results: BattleResultSummary[]
  failure_patterns: unknown
  strengths: unknown
  weaknesses: unknown
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
// GET Handler - Get Test Run Details
// ============================================================================

/**
 * GET /api/test-runs/[id]
 *
 * Fetches a single test run with its battle results.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid test run ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Fetch test run with prompt version info
    const { data: testRun, error: testRunError } = await supabase
      .from('test_runs')
      .select(`
        id,
        test_run_code,
        prompt_version_id,
        mode,
        status,
        current_iteration,
        max_iterations,
        overall_score,
        success_count,
        failure_count,
        timeout_count,
        tool_scenario_id,
        awaiting_review,
        last_heartbeat_at,
        started_at,
        completed_at,
        stopped_reason,
        failure_patterns,
        strengths,
        weaknesses,
        test_config,
        llm_config
      `)
      .eq('id', id)
      .single()

    if (testRunError || !testRun) {
      return NextResponse.json(
        { error: 'Test run not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Fetch prompt version details
    const { data: promptVersion } = await supabase
      .from('prompt_versions')
      .select('prompt_name, version')
      .eq('id', testRun.prompt_version_id)
      .single()

    // Fetch battle results with persona info
    const { data: battleResults, error: battleError } = await supabase
      .from('battle_results')
      .select(`
        id,
        persona_id,
        outcome,
        score,
        turns,
        created_at,
        personas (
          name,
          category
        )
      `)
      .eq('test_run_id', id)
      .order('created_at', { ascending: true })

    if (battleError) {
      console.error('[test-runs/id] Error fetching battle results:', battleError)
    }

    // Check for notes on each battle
    const battleIds = battleResults?.map(b => b.id) || []
    const { data: noteCounts } = await supabase
      .from('battle_notes')
      .select('battle_result_id')
      .in('battle_result_id', battleIds)

    const notesMap = new Set(noteCounts?.map(n => n.battle_result_id) || [])

    // Define persona type from query
    type PersonaData = { name: string; category: string }

    // Format battle results
    const formattedBattleResults: BattleResultSummary[] = (battleResults || []).map(br => {
      const persona = br.personas as PersonaData | PersonaData[] | null
      const personaObj = Array.isArray(persona) ? persona[0] : persona

      return {
        id: br.id,
        persona_id: br.persona_id,
        persona_name: personaObj?.name || 'Unknown',
        persona_category: personaObj?.category || 'Unknown',
        outcome: br.outcome,
        score: br.score,
        turns: br.turns,
        has_notes: notesMap.has(br.id),
        created_at: br.created_at
      }
    })

    // Build response
    const response: TestRunDetailResponse = {
      id: testRun.id,
      test_run_code: testRun.test_run_code,
      prompt_version_id: testRun.prompt_version_id,
      prompt_name: promptVersion?.prompt_name || 'Unknown',
      prompt_version: promptVersion?.version || 'Unknown',
      mode: testRun.mode,
      status: testRun.status,
      current_iteration: testRun.current_iteration,
      max_iterations: testRun.max_iterations,
      overall_score: testRun.overall_score,
      success_count: testRun.success_count || 0,
      failure_count: testRun.failure_count || 0,
      timeout_count: testRun.timeout_count || 0,
      tool_scenario_id: testRun.tool_scenario_id,
      awaiting_review: testRun.awaiting_review,
      last_heartbeat_at: testRun.last_heartbeat_at,
      started_at: testRun.started_at,
      completed_at: testRun.completed_at,
      stopped_reason: testRun.stopped_reason,
      battle_results: formattedBattleResults,
      failure_patterns: testRun.failure_patterns,
      strengths: testRun.strengths,
      weaknesses: testRun.weaknesses
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[test-runs/id] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH Handler - Update Test Run
// ============================================================================

/**
 * PATCH /api/test-runs/[id]
 *
 * Updates test run fields. Used for:
 * - Adding analysis notes
 * - Manual status updates (by admin)
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
        { error: 'Invalid test run ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Only allow updating specific fields
    const allowedFields = ['failure_patterns', 'strengths', 'weaknesses', 'test_config']
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

    const { data, error } = await supabase
      .from('test_runs')
      .update(updateData)
      .eq('id', id)
      .select('id, test_run_code')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update test run', code: 'INTERNAL_ERROR', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Test run not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, test_run_code: data.test_run_code })

  } catch (error) {
    console.error('[test-runs/id] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE Handler - Delete Test Run (Admin)
// ============================================================================

/**
 * DELETE /api/test-runs/[id]
 *
 * Deletes a test run and all associated battle results.
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
        { error: 'Invalid test run ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Check if test run exists and is not running
    const { data: testRun, error: checkError } = await supabase
      .from('test_runs')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !testRun) {
      return NextResponse.json(
        { error: 'Test run not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (testRun.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a running test. Abort it first.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Delete test run (cascade will delete battle_results and battle_notes)
    const { error: deleteError } = await supabase
      .from('test_runs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete test run', code: 'INTERNAL_ERROR', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`[test-runs/id] Deleted test run: ${id}`)

    return NextResponse.json({ success: true, message: 'Test run deleted' })

  } catch (error) {
    console.error('[test-runs/id] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
