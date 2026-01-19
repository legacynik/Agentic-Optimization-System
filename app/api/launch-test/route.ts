import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptVersionId, promptName, version, webhookUrl } = body

    // Configurazione N8N webhook - SOSTITUISCI CON IL TUO URL
    const N8N_WEBHOOK = webhookUrl || process.env.N8N_WEBHOOK_URL || 'https://your-n8n.app/webhook/test-runner'

    // Genera un test run ID univoco
    const testRunId = `TEST-${Date.now()}-${version}`

    // Chiama il webhook N8N con i dati minimi necessari
    // N8N sa già come recuperare le personas dal DB in base al prompt
    const n8nResponse = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testRunId,
        promptVersionId,
        promptName,
        version,
        timestamp: new Date().toISOString(),
        // N8N andrà a prendere automaticamente:
        // - Le personas associate a questo prompt dal DB
        // - Il contenuto del prompt dalla tabella prompts
        // - Eseguirà i test e salverà i risultati
      })
    })

    if (!n8nResponse.ok) {
      console.error('N8N webhook response not ok:', n8nResponse.status)
      throw new Error('Failed to trigger N8N workflow')
    }

    return NextResponse.json({
      success: true,
      testRunId,
      message: `Test avviato per ${promptName} ${version}`,
      status: 'Test workflow triggered successfully'
    })

  } catch (error) {
    console.error('Error triggering test:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger test workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}