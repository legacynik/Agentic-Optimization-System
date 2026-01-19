import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

// N8N Webhook URL - configure in environment
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/trigger-test-run'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptVersionId, personas, config } = body

    // Create test run in database
    const testRunId = `TEST-${Date.now()}`

    const supabase = getSupabaseAdmin()
    const { data: testRun, error } = await supabase
      .from('test_runs')
      .insert({
        test_run_code: testRunId,
        prompt_version_id: promptVersionId,
        personas_tested: personas.map((p: any) => p.id),
        test_config: config || {},
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Trigger N8N workflow
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dashboard-Secret': process.env.N8N_SECRET || 'your-secret'
      },
      body: JSON.stringify({
        testRunId,
        promptVersionId,
        personas,
        config,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/n8n/webhook`
      })
    })

    if (!n8nResponse.ok) {
      throw new Error('Failed to trigger N8N workflow')
    }

    return NextResponse.json({
      success: true,
      testRunId,
      message: 'Test run initiated',
      webhookUrl: `/api/n8n/status/${testRunId}`
    })

  } catch (error) {
    console.error('Error triggering test:', error)
    return NextResponse.json(
      { error: 'Failed to trigger test run' },
      { status: 500 }
    )
  }
}