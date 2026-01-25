/**
 * API Route: /api/test-runs
 *
 * CRUD operations for test runs.
 * - GET: List test runs with filtering and pagination
 * - POST: Create a new test run and trigger n8n workflow
 *
 * @module api/test-runs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid test run modes per PRD v2.4 */
type TestMode = 'single' | 'full_cycle_with_review'

/** Valid test run statuses - State Machine per PRD v3 */
type TestRunStatus =
  | 'pending'           // Creato, in attesa di avvio
  | 'running'           // Battles in corso (streaming)
  | 'battles_completed' // Battles finite, evaluator in attesa
  | 'evaluating'        // Evaluator in corso
  | 'completed'         // Tutto finito (analysis_report pronto)
  | 'failed'            // Errore
  | 'aborted'           // Abortito manualmente
  | 'awaiting_review'   // In attesa di review umana (full_cycle mode)

/** Valid tool scenario IDs (hardcoded per PRD v2.4) */
type ToolScenarioId = 'happy_path' | 'calendar_full' | 'booking_fails' | 'partial_availability'

/** Request body for creating a new test run */
interface CreateTestRunRequest {
  prompt_version_id: string
  mode: TestMode
  tool_scenario_id?: ToolScenarioId
  tool_mocks_override?: Record<string, unknown>
  max_iterations?: number
  llm_config?: {
    battleLlm?: string
    evaluatorLlm?: string
  }
}

/** Response for created test run */
interface CreateTestRunResponse {
  test_run_id: string
  test_run_code: string
  status: TestRunStatus
  webhook_triggered: boolean
  personas_count: number
  message?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates UUID format
 * @param uuid - String to validate
 * @returns true if valid UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Generates a unique test run code
 * Format: RUN-YYYYMMDD-HHmmss-XXX (XXX = random suffix)
 */
function generateTestRunCode(): string {
  const now = new Date()
  const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `RUN-${dateStr}-${suffix}`
}

/**
 * Fetches validated personas for a prompt
 * Uses created_for_prompt column in personas table (simpler than junction table)
 *
 * @param promptName - The prompt name to look up
 * @returns Array of persona UUIDs
 */
async function getPersonasForPrompt(promptName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('personas')
    .select('id')
    .eq('created_for_prompt', promptName)
    .eq('validation_status', 'validated')

  if (error) {
    console.error('[test-runs] Error fetching personas:', error)
    return []
  }

  if (!data || data.length === 0) {
    console.log(`[test-runs] No validated personas found for prompt: ${promptName}`)
    return []
  }

  return data.map(p => p.id)
}

/**
 * Triggers the n8n test runner workflow
 *
 * @param testRunId - UUID of the created test run
 * @param promptVersionId - UUID of the prompt version to test
 * @param mode - Test mode (single or full_cycle_with_review)
 * @param toolScenarioId - Optional tool mock scenario ID
 * @param toolMocksOverride - Optional inline tool mocks override
 * @param maxIterations - Max iterations for full cycle mode
 * @returns true if webhook triggered successfully
 */
async function triggerN8nWorkflow(
  testRunId: string,
  promptVersionId: string,
  mode: TestMode,
  toolScenarioId?: string,
  toolMocksOverride?: Record<string, unknown>,
  maxIterations?: number
): Promise<boolean> {
  // Get webhook URL from workflow_configs or env
  const { data: config } = await supabase
    .from('workflow_configs')
    .select('webhook_url')
    .eq('workflow_type', 'test_runner')
    .single()

  const webhookUrl = config?.webhook_url || process.env.N8N_TEST_RUNNER_WEBHOOK

  if (!webhookUrl) {
    console.error('[test-runs] No webhook URL configured for test_runner')
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include N8N secret for authentication (v2.3 Lean)
        'x-n8n-secret': process.env.N8N_SECRET || ''
      },
      body: JSON.stringify({
        test_run_id: testRunId,
        prompt_version_id: promptVersionId,
        mode,
        tool_scenario_id: toolScenarioId,
        tool_mocks_override: toolMocksOverride,
        max_iterations: maxIterations || (mode === 'full_cycle_with_review' ? 5 : 1),
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/n8n/webhook`,
        timestamp: Date.now()
      })
    })

    if (!response.ok) {
      console.error('[test-runs] Webhook response not ok:', response.status)
      return false
    }

    // Update workflow_configs tracking (increment done via separate call to avoid .rpc() inside .update())
    const { data: currentConfig } = await supabase
      .from('workflow_configs')
      .select('total_executions')
      .eq('workflow_type', 'test_runner')
      .single()

    await supabase
      .from('workflow_configs')
      .update({
        last_triggered_at: new Date().toISOString(),
        total_executions: (currentConfig?.total_executions || 0) + 1
      })
      .eq('workflow_type', 'test_runner')

    console.log(`[test-runs] Successfully triggered n8n workflow for test run ${testRunId}`)
    return true

  } catch (error) {
    console.error('[test-runs] Error triggering n8n workflow:', error)
    return false
  }
}

// ============================================================================
// GET Handler - List Test Runs
// ============================================================================

/**
 * GET /api/test-runs
 *
 * Lists test runs with optional filtering and pagination.
 *
 * Query params:
 * - status: Filter by status
 * - prompt_version_id: Filter by prompt version
 * - prompt_name: Filter by prompt name (joins prompt_versions table)
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 * - order: Sort order for started_at ('asc' or 'desc', default 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status')
    const promptVersionId = searchParams.get('prompt_version_id')
    const promptName = searchParams.get('prompt_name')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const order = searchParams.get('order') === 'asc' ? true : false

    // Build query with join to prompt_versions for prompt_name access
    let query = supabase
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
        analysis_report,
        analyzed_at,
        prompt_versions!inner(prompt_name, version)
      `, { count: 'exact' })
      .order('started_at', { ascending: order })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (promptVersionId) {
      query = query.eq('prompt_version_id', promptVersionId)
    }
    if (promptName) {
      query = query.eq('prompt_versions.prompt_name', promptName)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[test-runs] Error fetching test runs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch test runs', code: 'INTERNAL_ERROR', details: error.message },
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
    console.error('[test-runs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler - Create Test Run
// ============================================================================

/**
 * POST /api/test-runs
 *
 * Creates a new test run and triggers the n8n workflow.
 *
 * Request body:
 * - prompt_version_id: UUID (required)
 * - mode: 'single' | 'full_cycle_with_review' (required)
 * - tool_scenario_id: string (optional)
 * - tool_mocks_override: object (optional)
 * - max_iterations: number (optional, default 1 for single, 5 for full cycle)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTestRunRequest = await request.json()

    // ========================================================================
    // Validation
    // ========================================================================

    // Validate required fields
    if (!body.prompt_version_id) {
      return NextResponse.json(
        { error: 'prompt_version_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!isValidUUID(body.prompt_version_id)) {
      return NextResponse.json(
        { error: 'prompt_version_id must be a valid UUID', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes: TestMode[] = ['single', 'full_cycle_with_review']
    if (!body.mode || !validModes.includes(body.mode)) {
      return NextResponse.json(
        { error: 'mode must be "single" or "full_cycle_with_review"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate tool_scenario_id if provided
    const validScenarios: ToolScenarioId[] = ['happy_path', 'calendar_full', 'booking_fails', 'partial_availability']
    if (body.tool_scenario_id && !validScenarios.includes(body.tool_scenario_id as ToolScenarioId)) {
      return NextResponse.json(
        { error: 'Invalid tool_scenario_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // ========================================================================
    // Fetch Prompt Version
    // ========================================================================

    const { data: promptVersion, error: promptError } = await supabase
      .from('prompt_versions')
      .select('id, prompt_name, version, content, status')
      .eq('id', body.prompt_version_id)
      .single()

    if (promptError || !promptVersion) {
      return NextResponse.json(
        { error: 'Prompt version not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ========================================================================
    // Get Associated Personas (validated only)
    // ========================================================================

    const personaIds = await getPersonasForPrompt(promptVersion.prompt_name)

    if (personaIds.length === 0) {
      return NextResponse.json(
        {
          error: 'No validated personas found for this prompt. Associate and validate personas first.',
          code: 'NO_PERSONAS'
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // Create Test Run Record
    // ========================================================================

    const testRunCode = generateTestRunCode()
    const maxIterations = body.max_iterations || (body.mode === 'full_cycle_with_review' ? 5 : 1)

    const { data: testRun, error: createError } = await supabase
      .from('test_runs')
      .insert({
        test_run_code: testRunCode,
        prompt_version_id: body.prompt_version_id,
        personas_tested: personaIds,
        mode: body.mode,
        max_iterations: maxIterations,
        current_iteration: 1,
        tool_scenario_id: body.tool_scenario_id || null,
        test_config: body.tool_mocks_override ? { tool_mocks_override: body.tool_mocks_override } : {},
        llm_config: body.llm_config || {},
        status: 'pending',
        success_count: 0,
        failure_count: 0,
        timeout_count: 0
      })
      .select('id, test_run_code')
      .single()

    if (createError || !testRun) {
      console.error('[test-runs] Error creating test run:', createError)
      return NextResponse.json(
        { error: 'Failed to create test run', code: 'INTERNAL_ERROR', details: createError?.message },
        { status: 500 }
      )
    }

    // ========================================================================
    // Trigger n8n Workflow
    // ========================================================================

    const webhookTriggered = await triggerN8nWorkflow(
      testRun.id,
      body.prompt_version_id,
      body.mode,
      body.tool_scenario_id,
      body.tool_mocks_override,
      maxIterations
    )

    // Update status to running if webhook triggered successfully
    if (webhookTriggered) {
      await supabase
        .from('test_runs')
        .update({ status: 'running' })
        .eq('id', testRun.id)
    }

    // ========================================================================
    // Return Response
    // ========================================================================

    const response: CreateTestRunResponse = {
      test_run_id: testRun.id,
      test_run_code: testRun.test_run_code,
      status: webhookTriggered ? 'running' : 'pending',
      webhook_triggered: webhookTriggered,
      personas_count: personaIds.length,
      message: webhookTriggered
        ? `Test run started with ${personaIds.length} personas`
        : 'Test run created but webhook failed to trigger. Check n8n configuration.'
    }

    console.log(`[test-runs] Created test run ${testRun.test_run_code} for prompt ${promptVersion.prompt_name} v${promptVersion.version}`)

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('[test-runs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
