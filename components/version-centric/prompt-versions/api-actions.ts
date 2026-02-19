import { toast } from 'sonner'

export interface PromptVersionAPI {
  id: string
  prompt_name: string
  version: string
  content: string
  optimization_notes: string | null
  business_type: string | null
  status: string
  legacy_promptversionid: string | null
  created_from: string | null
  avg_success_rate: number | null
  avg_score: number | null
  avg_turns: number | null
  total_test_runs: number | null
  prompt_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Fetches all prompt versions, optionally filtered by prompt_name
 */
export async function fetchPromptVersions(promptName?: string): Promise<PromptVersionAPI[]> {
  const params = new URLSearchParams({ limit: '200' })
  if (promptName) {
    params.set('prompt_name', promptName)
  }

  const response = await fetch(`/api/prompt-versions?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch prompt versions')
  }

  const result = await response.json()
  return result.data || []
}

/**
 * Creates a new prompt version
 */
export async function createPromptVersion(data: {
  prompt_name: string
  version: string
  content: string
  optimization_notes?: string
  business_type?: string
  status?: string
  created_from?: string
}): Promise<PromptVersionAPI> {
  const response = await fetch('/api/prompt-versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const err = await response.json()
    const msg = err.error?.message || 'Failed to create prompt version'
    throw new Error(msg)
  }

  const result = await response.json()
  return result.data
}

/**
 * Updates a prompt version
 */
export async function updatePromptVersion(
  id: string,
  data: Partial<Pick<PromptVersionAPI, 'content' | 'optimization_notes' | 'business_type' | 'status'>>
): Promise<PromptVersionAPI> {
  const response = await fetch(`/api/prompt-versions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Failed to update prompt version')
  }

  const result = await response.json()
  return result.data
}

/**
 * Deletes a draft prompt version
 */
export async function deletePromptVersion(id: string): Promise<{ deleted: boolean }> {
  const response = await fetch(`/api/prompt-versions/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Failed to delete prompt version')
  }

  const result = await response.json()
  return result.data
}

/**
 * Wrapper that shows toast on error
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  errorMsg = 'Operation failed'
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : errorMsg
    toast.error(message)
    console.error(errorMsg, error)
    return null
  }
}
