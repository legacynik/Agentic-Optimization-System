import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Note category types per PRD 10.4
export type NoteCategory = 'issue' | 'suggestion' | 'positive' | 'question'

export interface BattleNote {
  id: string
  battle_result_id: string
  note: string
  category: NoteCategory
  created_at: string
  created_by: string | null
}

export interface CreateNoteInput {
  battle_result_id: string
  note: string
  category: NoteCategory
}

// Fetch notes for a battle result
async function fetchBattleNotes(battleResultId: string): Promise<BattleNote[]> {
  const res = await fetch(`/api/battle-notes?battle_result_id=${battleResultId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch battle notes')
  }
  return res.json()
}

// Fetch notes for a test run
async function fetchTestRunNotes(testRunId: string): Promise<BattleNote[]> {
  const res = await fetch(`/api/battle-notes?test_run_id=${testRunId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch test run notes')
  }
  return res.json()
}

// Create a new note
async function createBattleNote(input: CreateNoteInput): Promise<BattleNote> {
  const res = await fetch('/api/battle-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error('Failed to create note')
  }
  return res.json()
}

// Delete a note
async function deleteBattleNote(noteId: string): Promise<void> {
  const res = await fetch(`/api/battle-notes?id=${noteId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to delete note')
  }
}

/**
 * Hook for fetching battle notes for a specific battle result
 */
export function useBattleNotes(battleResultId: string | null) {
  return useQuery({
    queryKey: ['battle-notes', battleResultId],
    queryFn: () => fetchBattleNotes(battleResultId!),
    enabled: !!battleResultId,
  })
}

/**
 * Hook for fetching all notes for a test run
 */
export function useTestRunNotes(testRunId: string | null) {
  return useQuery({
    queryKey: ['test-run-notes', testRunId],
    queryFn: () => fetchTestRunNotes(testRunId!),
    enabled: !!testRunId,
  })
}

/**
 * Hook for creating a new battle note
 */
export function useCreateBattleNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBattleNote,
    onSuccess: (data) => {
      // Invalidate battle notes query to refetch
      queryClient.invalidateQueries({
        queryKey: ['battle-notes', data.battle_result_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['test-run-notes'],
      })
    },
  })
}

/**
 * Hook for deleting a battle note
 */
export function useDeleteBattleNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBattleNote,
    onSuccess: () => {
      // Invalidate all battle notes queries
      queryClient.invalidateQueries({
        queryKey: ['battle-notes'],
      })
      queryClient.invalidateQueries({
        queryKey: ['test-run-notes'],
      })
    },
  })
}

/**
 * Category display configuration per PRD 10.4
 */
export const NOTE_CATEGORIES: Array<{
  value: NoteCategory
  label: string
  emoji: string
}> = [
  { value: 'issue', label: 'Issue', emoji: '🐛' },
  { value: 'suggestion', label: 'Suggestion', emoji: '💡' },
  { value: 'positive', label: 'Positive', emoji: '✅' },
  { value: 'question', label: 'Question', emoji: '❓' },
]
