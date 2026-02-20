/**
 * API Route: /api/evaluations/re-evaluate
 *
 * Triggers re-evaluation of a test run with a different evaluator config.
 * - POST: Create a new evaluation for an existing test run
 *
 * @module api/evaluations/re-evaluate
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'
import { isValidUUID } from '@/lib/validation'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Re-evaluate request body */
interface ReEvaluateRequest {
  test_run_id: string
  evaluator_config_id: string
  run_analyzer?: boolean // T5: Optional flag to skip LLM Analyzer (default: true)
}

// ============================================================================
// POST Handler - Re-evaluate Test Run
// ============================================================================

/**
 * POST /api/evaluations/re-evaluate
 *
 * Creates a new evaluation for a completed test run using a different evaluator config.
 * This enables A/B testing of different evaluator configurations.
 *
 * Request body:
 * - test_run_id: UUID (required) - Must be a completed test run
 * - evaluator_config_id: UUID (required) - Must exist and be active
 *
 * Validation:
 * - Test run must exist and have status='completed'
 * - Evaluator config must exist
 * - If duplicate evaluation exists, returns existing record
 *
 * The created evaluation will have:
 * - status='pending' (will be picked up by n8n workflow)
 * - is_promoted=false (never auto-promote re-evaluations)
 * - triggered_by='manual'
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReEvaluateRequest = await request.json()

    // Validate required fields
    if (!body.test_run_id) {
      return apiError('test_run_id is required', 'VALIDATION_ERROR', 400)
    }

    if (!body.evaluator_config_id) {
      return apiError('evaluator_config_id is required', 'VALIDATION_ERROR', 400)
    }

    // Validate UUID formats
    if (!isValidUUID(body.test_run_id)) {
      return apiError('Invalid test_run_id format', 'VALIDATION_ERROR', 400)
    }

    if (!isValidUUID(body.evaluator_config_id)) {
      return apiError('Invalid evaluator_config_id format', 'VALIDATION_ERROR', 400)
    }

    // Step 1: Validate test_run exists and is completed
    const { data: testRun, error: testRunError } = await supabase
      .from('test_runs')
      .select('id, status')
      .eq('id', body.test_run_id)
      .single()

    if (testRunError || !testRun) {
      console.error('[evaluations/re-evaluate] Test run not found:', testRunError)
      return apiError('Test run not found', 'NOT_FOUND', 404)
    }

    if (testRun.status !== 'completed') {
      return apiError(
        `Cannot re-evaluate test run with status '${testRun.status}'. Only completed test runs can be re-evaluated.`,
        'INVALID_STATUS',
        400
      )
    }

    // Step 2: Validate evaluator_config exists and fetch criteria + llm_config for snapshot
    const { data: evaluatorConfig, error: configError } = await supabase
      .from('evaluator_configs')
      .select('id, name, version, status, criteria, llm_config')
      .eq('id', body.evaluator_config_id)
      .single()

    if (configError || !evaluatorConfig) {
      console.error('[evaluations/re-evaluate] Evaluator config not found:', configError)
      return apiError('Evaluator config not found', 'NOT_FOUND', 404)
    }

    // Optional: Warn if evaluator config is deprecated (but allow it)
    if (evaluatorConfig.status === 'deprecated') {
      console.warn(`[evaluations/re-evaluate] Using deprecated evaluator config: ${evaluatorConfig.name} v${evaluatorConfig.version}`)
    }

    // Step 3: Check for existing evaluation with same combo
    const { data: existingEvaluation, error: existingError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('test_run_id', body.test_run_id)
      .eq('evaluator_config_id', body.evaluator_config_id)
      .single()

    // If evaluation already exists, return it (idempotent)
    if (existingEvaluation) {
      console.log(`[evaluations/re-evaluate] Evaluation already exists: ${existingEvaluation.id}`)
      return apiSuccess({
        ...existingEvaluation,
        message: 'Evaluation already exists for this test run and evaluator config'
      })
    }

    // Step 4: Create new evaluation with criteria + llm_config snapshots (T4)
    const { data: newEvaluation, error: createError } = await supabase
      .from('evaluations')
      .insert({
        test_run_id: body.test_run_id,
        evaluator_config_id: body.evaluator_config_id,
        status: 'pending',
        is_promoted: false,
        triggered_by: 'manual',
        success_count: 0,
        failure_count: 0,
        partial_count: 0,
        criteria_snapshot: evaluatorConfig.criteria,
        llm_config_snapshot: evaluatorConfig.llm_config
      })
      .select()
      .single()

    if (createError || !newEvaluation) {
      console.error('[evaluations/re-evaluate] Error creating evaluation:', createError)
      return apiError('Failed to create evaluation', 'INTERNAL_ERROR', 500)
    }

    console.log(`[evaluations/re-evaluate] Created evaluation: ${newEvaluation.id} for test_run ${body.test_run_id} with evaluator ${evaluatorConfig.name} v${evaluatorConfig.version}`)

    // Step 5: Trigger n8n evaluator workflow
    const { data: webhookConfig } = await supabase
      .from('workflow_configs')
      .select('webhook_url, is_active')
      .eq('workflow_type', 'evaluator')
      .single()

    if (webhookConfig?.webhook_url && webhookConfig.is_active) {
      try {
        const runAnalyzer = body.run_analyzer !== false // default: true
        const triggerPayload = {
          test_run_id: body.test_run_id,
          evaluation_id: newEvaluation.id,
          evaluator_config_id: body.evaluator_config_id,
          run_analyzer: runAnalyzer,
          triggered_by: 'manual',
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/n8n/webhook`,
          timestamp: Date.now()
        }

        const webhookResponse = await fetch(webhookConfig.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-n8n-secret': process.env.N8N_SECRET || ''
          },
          body: JSON.stringify(triggerPayload)
        })

        if (!webhookResponse.ok) {
          console.error('[evaluations/re-evaluate] n8n webhook failed:', webhookResponse.status)
          await supabase
            .from('evaluations')
            .update({ status: 'failed', error_message: `n8n webhook returned ${webhookResponse.status}` })
            .eq('id', newEvaluation.id)
        } else {
          console.log(`[evaluations/re-evaluate] n8n evaluator triggered for evaluation ${newEvaluation.id}`)
          await supabase
            .from('evaluations')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', newEvaluation.id)
        }
      } catch (webhookError) {
        console.error('[evaluations/re-evaluate] Failed to trigger n8n:', webhookError)
        await supabase
          .from('evaluations')
          .update({
            status: 'failed',
            error_message: webhookError instanceof Error ? webhookError.message : 'n8n webhook unreachable'
          })
          .eq('id', newEvaluation.id)
      }
    } else {
      await supabase
        .from('evaluations')
        .update({ status: 'failed', error_message: 'No evaluator webhook configured. Check Settings.' })
        .eq('id', newEvaluation.id)
    }

    return apiSuccess({
      ...newEvaluation,
      message: 'Evaluation created successfully. It will be processed by the evaluation workflow.'
    }, undefined, 201)

  } catch (error) {
    console.error('[evaluations/re-evaluate] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
