import { NextRequest, NextResponse } from 'next/server'

// Ottieni l'URL del webhook N8N dall'environment
const N8N_PERSONA_GENERATOR_WEBHOOK = process.env.N8N_PERSONA_GENERATOR_WEBHOOK || 'https://your-n8n-instance.com/webhook/persona-generator'

export async function POST(request: NextRequest) {
  try {
    const { promptVersionId, promptName, version, isFirstVersion } = await request.json()

    // Genera un ID univoco per questa richiesta
    const requestId = `PERSONAS-${Date.now()}-${version}`

    // Prepara il payload per N8N
    const n8nPayload = {
      requestId,
      promptVersionId,
      promptName,
      version,
      isFirstVersion,
      generationType: isFirstVersion ? 'initial' : 'optimization',
      timestamp: new Date().toISOString()
    }

    // Chiama il webhook N8N per avviare la generazione delle personas
    const n8nResponse = await fetch(N8N_PERSONA_GENERATOR_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aggiungi API key se necessario
        ...(process.env.N8N_API_KEY && {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`
        })
      },
      body: JSON.stringify(n8nPayload)
    })

    if (!n8nResponse.ok) {
      throw new Error(`N8N webhook returned ${n8nResponse.status}`)
    }

    const n8nData = await n8nResponse.json()

    // Restituisci la risposta al client
    return NextResponse.json({
      success: true,
      requestId,
      message: `Generazione personas avviata per ${promptName} ${version}`,
      n8nResponse: n8nData
    })

  } catch (error) {
    console.error('Error calling N8N persona generator:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate personas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}