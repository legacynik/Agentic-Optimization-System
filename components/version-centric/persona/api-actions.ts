import { toast } from 'sonner'
import { Persona } from './types'

/**
 * Fetches personas from the API
 */
export async function fetchPersonasFromAPI(promptName: string): Promise<Persona[]> {
  const params = new URLSearchParams()
  if (promptName) {
    params.set('created_for_prompt', promptName)
  }
  params.set('limit', '100')

  const response = await fetch(`/api/personas?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch personas')
  }

  const result = await response.json()
  return (result.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    psychological_profile: p.psychological_profile,
    personaprompt: p.personaprompt,
    category: p.category,
    difficulty: p.difficulty || 'medium',
    behaviors: p.behaviors || [],
    created_by: p.created_by || 'human',
    validated_by_human: p.validated_by_human,
    validation_status: p.validation_status || 'pending',
    feedback_notes: p.feedback_notes || []
  }))
}

/**
 * Triggers persona generation via n8n workflow
 */
export async function triggerPersonaGeneration(
  promptName: string,
  promptVersion: string
): Promise<boolean> {
  const settingsRes = await fetch('/api/settings')
  const settings = await settingsRes.json()

  const generatorConfig = settings.data?.find(
    (c: any) => c.workflow_type === 'personas_generator'
  )

  if (!generatorConfig?.webhook_url || !generatorConfig?.is_active) {
    toast.info(
      'Persona Generator workflow not configured. Configure it in Settings.',
      { duration: 5000 }
    )
    return false
  }

  const response = await fetch(generatorConfig.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt_name: promptName,
      prompt_version: promptVersion,
      count: 5,
      criteria: {
        difficulty_mix: { easy: 0.3, medium: 0.4, hard: 0.2, extreme: 0.1 },
        categories: ['decision_maker', 'skeptical', 'busy', 'collaborative']
      }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to trigger persona generation')
  }

  return true
}

/**
 * Updates persona validation status
 */
export async function updatePersonaValidation(
  personaId: string,
  validated: boolean
): Promise<void> {
  const response = await fetch(`/api/personas/${personaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      validation_status: 'validated',
      validated_by_human: validated
    })
  })

  if (!response.ok) {
    throw new Error('Failed to validate persona')
  }
}

/**
 * Deletes a persona
 */
export async function deletePersonaAPI(personaId: string): Promise<void> {
  const response = await fetch(`/api/personas/${personaId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error('Failed to delete persona')
  }
}

/**
 * Creates a new persona
 */
export async function createPersona(persona: Persona, promptName: string): Promise<Persona> {
  const response = await fetch('/api/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: persona.name,
      description: persona.description,
      psychological_profile: persona.psychological_profile,
      personaprompt: persona.personaprompt || persona.psychological_profile || '',
      category: persona.category,
      difficulty: persona.difficulty,
      behaviors: persona.behaviors,
      created_for_prompt: promptName,
      created_by: 'human'
    })
  })

  if (!response.ok) {
    throw new Error('Failed to create persona')
  }

  return await response.json()
}

/**
 * Updates an existing persona
 */
export async function updatePersona(persona: Persona): Promise<void> {
  const response = await fetch(`/api/personas/${persona.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: persona.name,
      description: persona.description,
      psychological_profile: persona.psychological_profile,
      category: persona.category,
      difficulty: persona.difficulty,
      behaviors: persona.behaviors
    })
  })

  if (!response.ok) {
    throw new Error('Failed to update persona')
  }
}

/**
 * Submits feedback for a persona
 */
export async function submitPersonaFeedback(
  personaId: string,
  note: string,
  category: string
): Promise<void> {
  const response = await fetch(`/api/personas/${personaId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, category })
  })

  if (!response.ok) {
    throw new Error('Failed to submit feedback')
  }
}
