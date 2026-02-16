/**
 * API Route: /api/n8n/webhook
 *
 * Receives callbacks from n8n workflows.
 * Handles status updates, progress reports, and result storage.
 *
 * Security: Validates x-n8n-secret header (v2.3 Lean simple auth)
 *
 * @module api/n8n/webhook
 */

import { NextRequest } from 'next/server'
import { isValidUUID } from '@/lib/validation'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions (per PRD v2.4 API Contracts)
// ============================================================================

/** Workflow types that can send callbacks */
type WorkflowType =
  | 'test_runner'
  | 'evaluator'
  | 'analyzer'
  | 'optimizer'
  | 'personas_generator'
  | 'personas_validator'

/** Callback status types */
type CallbackStatus = 'started' | 'progress' | 'completed' | 'failed'

/** Battle outcome types */
type BattleOutcome = 'success' | 'partial' | 'failure' | 'timeout' | 'tool_error'

/** Error codes for workflow errors */
type ErrorCode =
  | 'WEBHOOK_FAILED'
  | 'PERSONA_ERROR'
  | 'AI_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

/** Progress info for callbacks */
interface ProgressInfo {
  current: number
  total: number
  current_persona?: string
  current_turn?: number
  message?: string
}

/** Error info for failed callbacks */
interface ErrorInfo {
  code: ErrorCode
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}

/** Battle result from n8n */
interface BattleResultPayload {
  persona_id: string
  outcome: BattleOutcome
  score?: number
  turns: number
  transcript: unknown
  evaluation_details?: unknown
  tool_session_state?: Record<string, unknown>
}

/** Main callback payload structure */
interface N8nCallbackPayload {
  workflow_type: WorkflowType
  test_run_id: string
  status: CallbackStatus
  progress?: ProgressInfo
  error?: ErrorInfo
  result?: {
    battle_result?: BattleResultPayload
    battles_completed?: number
    average_score?: number
    analysis?: unknown
    optimization?: unknown
    personas_generated?: number
    [key: string]: unknown
  }
  timestamp?: number
  nonce?: string
}

// ============================================================================
// Security
// ============================================================================

/**
 * Verifies the n8n secret header (v2.3 Lean simple auth)
 *
 * Note: This is a simple string comparison, not HMAC.
 * Per PRD v2.3 Lean, timing-safe comparison is not needed for single-user agency.
 *
 * @param request - Incoming request
 * @returns true if secret matches
 */
function verifyN8nSecret(request: NextRequest): boolean {
  const secret = process.env.N8N_SECRET

  // If no secret configured, log warning but allow (for development)
  if (!secret) {
    console.warn('[n8n/webhook] WARNING: N8N_SECRET not configured. Allowing request.')
    return true
  }

  // Check x-n8n-secret header (case-insensitive)
  const providedSecret = request.headers.get('x-n8n-secret')

  if (!providedSecret) {
    console.error('[n8n/webhook] Missing x-n8n-secret header')
    return false
  }

  if (providedSecret !== secret) {
    console.error('[n8n/webhook] Invalid x-n8n-secret header')
    return false
  }

  return true
}

// ============================================================================
// Callback Handlers
// ============================================================================

/**
 * Handles test_runner workflow callbacks
 */
async function handleTestRunnerCallback(payload: N8nCallbackPayload): Promise<void> {
  const { test_run_id, status, progress, result, error } = payload

  // Update heartbeat on any callback
  await supabase
    .from('test_runs')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', test_run_id)

  switch (status) {
    case 'started':
      console.log(`[n8n/webhook] Test run ${test_run_id} started`)
      await supabase
        .from('test_runs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', test_run_id)
      break

    case 'progress':
      // Log progress, optionally store in test_config
      if (progress) {
        console.log(`[n8n/webhook] Test run ${test_run_id} progress: ${progress.current}/${progress.total}`)
        if (progress.current_persona) {
          console.log(`[n8n/webhook]   Current persona: ${progress.current_persona}`)
        }
      }

      // If battle result included, save it
      if (result?.battle_result) {
        await saveBattleResult(test_run_id, result.battle_result)
      }
      break

    case 'completed':
      console.log(`[n8n/webhook] Test run ${test_run_id} completed`)
      await supabase
        .from('test_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          overall_score: result?.average_score || null
        })
        .eq('id', test_run_id)

      // Update aggregate counts
      await updateTestRunAggregates(test_run_id)
      break

    case 'failed':
      console.error(`[n8n/webhook] Test run ${test_run_id} failed:`, error)
      // Fetch current test_config and merge error info
      const { data: currentRun } = await supabase
        .from('test_runs')
        .select('test_config')
        .eq('id', test_run_id)
        .single()

      const updatedConfig = {
        ...(currentRun?.test_config || {}),
        last_error: error
      }

      await supabase
        .from('test_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          stopped_reason: 'error',
          test_config: updatedConfig
        })
        .eq('id', test_run_id)
      break
  }
}

/**
 * Handles evaluator workflow callbacks
 */
async function handleEvaluatorCallback(payload: N8nCallbackPayload): Promise<void> {
  const { test_run_id, status, result, error } = payload

  // Update heartbeat
  await supabase
    .from('test_runs')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', test_run_id)

  if (status === 'completed') {
    console.log(`[n8n/webhook] Evaluation completed for test run ${test_run_id}`)

    // Check test run mode to determine next step
    const { data: testRun } = await supabase
      .from('test_runs')
      .select('mode')
      .eq('id', test_run_id)
      .single()

    if (testRun?.mode === 'full_cycle_with_review') {
      // Pause for human review
      await supabase
        .from('test_runs')
        .update({
          status: 'awaiting_review',
          awaiting_review: true,
          review_requested_at: new Date().toISOString()
        })
        .eq('id', test_run_id)

      console.log(`[n8n/webhook] Test run ${test_run_id} paused for human review`)
    } else {
      // Single mode - just mark as completed
      await supabase
        .from('test_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          overall_score: result?.average_score || null
        })
        .eq('id', test_run_id)
    }

    // Update aggregate counts
    await updateTestRunAggregates(test_run_id)
  }

  if (status === 'failed' && error) {
    console.error(`[n8n/webhook] Evaluator failed for test run ${test_run_id}:`, error)
  }
}

/**
 * Handles analyzer workflow callbacks
 */
async function handleAnalyzerCallback(payload: N8nCallbackPayload): Promise<void> {
  const { test_run_id, status, result } = payload

  if (status === 'completed' && result?.analysis) {
    console.log(`[n8n/webhook] Analysis completed for test run ${test_run_id}`)

    const analysis = result.analysis as {
      failure_patterns?: unknown
      strengths?: unknown
      weaknesses?: unknown
    }

    await supabase
      .from('test_runs')
      .update({
        failure_patterns: analysis.failure_patterns || null,
        strengths: analysis.strengths || null,
        weaknesses: analysis.weaknesses || null
      })
      .eq('id', test_run_id)
  }
}

/**
 * Handles optimizer workflow callbacks
 */
async function handleOptimizerCallback(payload: N8nCallbackPayload): Promise<void> {
  const { test_run_id, status, result } = payload

  if (status === 'completed' && result?.optimization) {
    console.log(`[n8n/webhook] Optimization completed for test run ${test_run_id}`)
    // The optimizer creates a new draft prompt_version
    // No direct update to test_runs needed
  }
}

/**
 * Handles personas_generator workflow callbacks
 */
async function handlePersonasGeneratorCallback(payload: N8nCallbackPayload): Promise<void> {
  const { status, result } = payload

  if (status === 'completed') {
    console.log(`[n8n/webhook] Personas generation completed. Generated: ${result?.personas_generated || 'unknown'}`)
  }
}

/**
 * Handles personas_validator workflow callbacks
 */
async function handlePersonasValidatorCallback(payload: N8nCallbackPayload): Promise<void> {
  const { status, result } = payload

  if (status === 'completed' && result?.persona_id) {
    console.log(`[n8n/webhook] Persona ${result.persona_id} validation completed`)

    const validationResult = result.validated as boolean

    await supabase
      .from('personas')
      .update({
        validation_status: validationResult ? 'validated' : 'pending'
      })
      .eq('id', result.persona_id)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Saves a battle result to the database
 * Implements idempotency: skips insert if result already exists for same test_run + persona
 * Throws an error if insert fails to prevent silent data loss
 */
async function saveBattleResult(testRunId: string, battleResult: BattleResultPayload): Promise<void> {
  // Idempotency check: verify if battle result already exists
  const { data: existing } = await supabase
    .from('battle_results')
    .select('id')
    .eq('test_run_id', testRunId)
    .eq('persona_id', battleResult.persona_id)
    .maybeSingle()

  if (existing) {
    console.log(`[n8n/webhook] Idempotency: Battle result already exists for test_run=${testRunId}, persona=${battleResult.persona_id}. Skipping duplicate.`)
    return
  }

  // Insert new battle result
  const { data, error } = await supabase
    .from('battle_results')
    .insert({
      test_run_id: testRunId,
      persona_id: battleResult.persona_id,
      outcome: battleResult.outcome,
      score: battleResult.score || null,
      turns: battleResult.turns,
      transcript: battleResult.transcript,
      evaluation_details: battleResult.evaluation_details || null,
      tool_session_state: battleResult.tool_session_state || {}
    })
    .select()
    .single()

  if (error) {
    console.error('[n8n/webhook] Failed to save battle result:', error)
    throw new Error(`Battle result save failed: ${error.message}`)
  }

  console.log(`[n8n/webhook] Saved battle result for persona ${battleResult.persona_id}, id: ${data.id}`)
}

/**
 * Updates aggregate counts on the test run
 */
async function updateTestRunAggregates(testRunId: string): Promise<void> {
  // Get counts from battle_results
  const { data: results } = await supabase
    .from('battle_results')
    .select('outcome, score')
    .eq('test_run_id', testRunId)

  if (!results) return

  const successCount = results.filter(r => r.outcome === 'success').length
  const failureCount = results.filter(r => ['failure', 'tool_error'].includes(r.outcome)).length
  const timeoutCount = results.filter(r => r.outcome === 'timeout').length

  const scores = results.filter(r => r.score !== null).map(r => r.score)
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null

  await supabase
    .from('test_runs')
    .update({
      success_count: successCount,
      failure_count: failureCount,
      timeout_count: timeoutCount,
      overall_score: avgScore
    })
    .eq('id', testRunId)

  console.log(`[n8n/webhook] Updated aggregates for test run ${testRunId}: success=${successCount}, failure=${failureCount}, timeout=${timeoutCount}`)
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * POST /api/n8n/webhook
 *
 * Receives callbacks from n8n workflows.
 *
 * Required headers:
 * - x-n8n-secret: Shared secret for authentication
 *
 * Request body: N8nCallbackPayload
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // Security Verification
    // ========================================================================

    if (!verifyN8nSecret(request)) {
      return apiError('Unauthorized', 'UNAUTHORIZED', 401)
    }

    // ========================================================================
    // Parse and Validate Payload
    // ========================================================================

    const payload: N8nCallbackPayload = await request.json()

    // Validate required fields
    if (!payload.workflow_type) {
      return apiError('Missing workflow_type', 'VALIDATION_ERROR', 400)
    }

    if (!payload.status) {
      return apiError('Missing status', 'VALIDATION_ERROR', 400)
    }

    // Validate test_run_id if required for this workflow type
    const workflowsRequiringTestRunId: WorkflowType[] = ['test_runner', 'evaluator', 'analyzer', 'optimizer']
    if (workflowsRequiringTestRunId.includes(payload.workflow_type)) {
      if (!payload.test_run_id || !isValidUUID(payload.test_run_id)) {
        return apiError('Invalid or missing test_run_id', 'INVALID_UUID', 400)
      }
    }

    // ========================================================================
    // Route to Appropriate Handler
    // ========================================================================

    console.log(`[n8n/webhook] Received ${payload.status} callback from ${payload.workflow_type}`)

    switch (payload.workflow_type) {
      case 'test_runner':
        await handleTestRunnerCallback(payload)
        break

      case 'evaluator':
        await handleEvaluatorCallback(payload)
        break

      case 'analyzer':
        await handleAnalyzerCallback(payload)
        break

      case 'optimizer':
        await handleOptimizerCallback(payload)
        break

      case 'personas_generator':
        await handlePersonasGeneratorCallback(payload)
        break

      case 'personas_validator':
        await handlePersonasValidatorCallback(payload)
        break

      default:
        console.warn(`[n8n/webhook] Unknown workflow type: ${payload.workflow_type}`)
    }

    // ========================================================================
    // Update workflow_configs tracking
    // ========================================================================

    if (payload.status === 'completed') {
      await supabase
        .from('workflow_configs')
        .update({ last_success_at: new Date().toISOString() })
        .eq('workflow_type', payload.workflow_type)
    }

    // ========================================================================
    // Return Success
    // ========================================================================

    return apiSuccess({
      message: 'Webhook processed successfully',
      workflow_type: payload.workflow_type,
      status: payload.status
    })

  } catch (error) {
    console.error('[n8n/webhook] Error processing webhook:', error)
    return apiError('Webhook processing failed', 'INTERNAL_ERROR', 500)
  }
}

// ============================================================================
// Health Check (GET)
// ============================================================================

/**
 * GET /api/n8n/webhook
 *
 * Health check endpoint for n8n to verify webhook is reachable.
 */
export async function GET() {
  return apiSuccess({
    status: 'ok',
    message: 'n8n webhook endpoint is ready',
    timestamp: new Date().toISOString()
  })
}
