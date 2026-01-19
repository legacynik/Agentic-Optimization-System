/**
 * API Route: /api/test-runs/[id]/abort
 *
 * Kill switch for running test runs.
 * Sets status to 'aborted' so n8n workflows check and stop gracefully.
 *
 * @module api/test-runs/[id]/abort
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * POST /api/test-runs/[id]/abort
 *
 * Aborts a running test run. The n8n workflow should check
 * the status before each major operation and stop gracefully.
 *
 * Per PRD v2.4: Check Abort is positioned at 2 points in the workflow:
 * 1. Before LLM call
 * 2. After LLM call
 */
export async function POST(
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

    // Check if test run exists and is running
    const { data: testRun, error: checkError } = await supabase
      .from('test_runs')
      .select('id, test_run_code, status')
      .eq('id', id)
      .single()

    if (checkError || !testRun) {
      return NextResponse.json(
        { error: 'Test run not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Only running or pending tests can be aborted
    if (!['running', 'pending', 'awaiting_review'].includes(testRun.status)) {
      return NextResponse.json(
        {
          error: `Cannot abort test with status "${testRun.status}". Only running, pending, or awaiting_review tests can be aborted.`,
          code: 'VALIDATION_ERROR',
          current_status: testRun.status
        },
        { status: 400 }
      )
    }

    // Update status to aborted
    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        status: 'aborted',
        stopped_reason: 'human_stop',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[test-runs/abort] Error aborting test run:', updateError)
      return NextResponse.json(
        { error: 'Failed to abort test run', code: 'INTERNAL_ERROR', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[test-runs/abort] Aborted test run: ${testRun.test_run_code}`)

    return NextResponse.json({
      success: true,
      test_run_id: id,
      test_run_code: testRun.test_run_code,
      message: 'Test run aborted. The n8n workflow will stop at the next Check Abort point.',
      previous_status: testRun.status,
      new_status: 'aborted'
    })

  } catch (error) {
    console.error('[test-runs/abort] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
