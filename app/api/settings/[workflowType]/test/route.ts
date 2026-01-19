/**
 * API Route: /api/settings/[workflowType]/test
 *
 * Tests connectivity to a workflow webhook.
 * Sends a ping request to verify the webhook is reachable.
 *
 * @module api/settings/[workflowType]/test
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

/** Valid workflow types */
type WorkflowType =
  | 'test_runner'
  | 'evaluator'
  | 'personas_generator'
  | 'analyzer'
  | 'optimizer'
  | 'personas_validator'

// ============================================================================
// POST Handler - Test Webhook
// ============================================================================

/**
 * POST /api/settings/[workflowType]/test
 *
 * Tests connectivity to the configured webhook URL.
 *
 * Path params:
 * - workflowType: The workflow type to test
 *
 * Request body (optional):
 * - webhook_url: Override URL to test (useful for testing before saving)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowType: string }> }
) {
  try {
    const { workflowType } = await params
    const body = await request.json().catch(() => ({}))

    // Validate workflow type
    const validTypes: WorkflowType[] = [
      'test_runner', 'evaluator', 'personas_generator',
      'analyzer', 'optimizer', 'personas_validator'
    ]

    if (!validTypes.includes(workflowType as WorkflowType)) {
      return NextResponse.json(
        { error: 'Invalid workflow type', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Get webhook URL (from body override or from config)
    let webhookUrl = body.webhook_url

    if (!webhookUrl) {
      const { data: config, error } = await supabase
        .from('workflow_configs')
        .select('webhook_url')
        .eq('workflow_type', workflowType)
        .single()

      if (error || !config) {
        return NextResponse.json(
          { error: 'Workflow config not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      webhookUrl = config.webhook_url
    }

    // Validate URL
    if (!webhookUrl || webhookUrl.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'No webhook URL configured',
          code: 'NOT_CONFIGURED'
        },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook URL format',
          code: 'INVALID_URL'
        },
        { status: 400 }
      )
    }

    // Test the webhook
    const startTime = Date.now()
    let testResult: {
      success: boolean
      status_code?: number
      response_time_ms?: number
      error?: string
      response_preview?: string
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-n8n-secret': process.env.N8N_SECRET || '',
          'x-test-ping': 'true'
        },
        body: JSON.stringify({
          test: true,
          workflow_type: workflowType,
          timestamp: Date.now(),
          source: 'dashboard-ping'
        }),
        // Set a reasonable timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const responseTime = Date.now() - startTime

      // Get response text (might be useful for debugging)
      let responsePreview = ''
      try {
        const text = await response.text()
        responsePreview = text.substring(0, 200) // First 200 chars
      } catch {
        responsePreview = '[Unable to read response]'
      }

      testResult = {
        success: response.ok,
        status_code: response.status,
        response_time_ms: responseTime,
        response_preview: responsePreview
      }

      if (!response.ok) {
        testResult.error = `HTTP ${response.status}: ${response.statusText}`
      }

    } catch (fetchError) {
      const responseTime = Date.now() - startTime

      testResult = {
        success: false,
        response_time_ms: responseTime,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }
    }

    console.log(`[settings/test] Tested ${workflowType} webhook: ${testResult.success ? 'OK' : 'FAILED'}`)

    return NextResponse.json({
      workflow_type: workflowType,
      webhook_url: webhookUrl,
      ...testResult
    })

  } catch (error) {
    console.error('[settings/test] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
