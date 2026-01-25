import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Test run status types per PRD v3 - State Machine
export type TestRunStatus =
  | 'pending'           // Creato, in attesa di avvio
  | 'running'           // Battles in corso
  | 'battles_completed' // Battles finite, evaluator in attesa
  | 'evaluating'        // Evaluator in corso
  | 'completed'         // Tutto finito (analysis_report pronto)
  | 'failed'            // Errore
  | 'aborted'           // Abortito manualmente
  | 'awaiting_review'   // In attesa di review umana (full_cycle mode)

/** Test run interface matching API response structure */
export interface TestRun {
  id: string
  test_run_code: string
  prompt_version_id: string
  tool_scenario_id: string | null
  mode: 'single' | 'full_cycle_with_review'
  status: TestRunStatus
  current_iteration: number
  max_iterations: number
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  awaiting_review: boolean
  last_heartbeat_at: string | null
  started_at: string
  completed_at: string | null
  stopped_reason: string | null
  // Computed fields for UI
  progress: number
  total_personas: number
  completed_personas: number
  avg_score: number | null
  error_message: string | null
}

/** API response structure for list endpoint */
interface TestRunsListResponse {
  data: TestRun[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

/** Normalizes API response to TestRun with computed fields */
function normalizeTestRun(raw: Partial<TestRun>): TestRun {
  const totalBattles = (raw.success_count || 0) + (raw.failure_count || 0) + (raw.timeout_count || 0)
  const maxBattles = raw.max_iterations || 1

  return {
    id: raw.id || '',
    test_run_code: raw.test_run_code || '',
    prompt_version_id: raw.prompt_version_id || '',
    tool_scenario_id: raw.tool_scenario_id || null,
    mode: raw.mode || 'single',
    status: raw.status || 'pending',
    current_iteration: raw.current_iteration || 1,
    max_iterations: raw.max_iterations || 1,
    overall_score: raw.overall_score ?? null,
    success_count: raw.success_count || 0,
    failure_count: raw.failure_count || 0,
    timeout_count: raw.timeout_count || 0,
    awaiting_review: raw.awaiting_review || false,
    last_heartbeat_at: raw.last_heartbeat_at || null,
    started_at: raw.started_at || new Date().toISOString(),
    completed_at: raw.completed_at || null,
    stopped_reason: raw.stopped_reason || null,
    // Computed fields
    progress: maxBattles > 0 ? Math.round((totalBattles / maxBattles) * 100) : 0,
    total_personas: maxBattles,
    completed_personas: totalBattles,
    avg_score: raw.overall_score ?? null,
    error_message: raw.stopped_reason || null,
  }
}

// Fetch single test run
async function fetchTestRun(testRunId: string): Promise<TestRun> {
  const res = await fetch(`/api/test-runs/${testRunId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch test run')
  }
  const raw = await res.json()
  return normalizeTestRun(raw)
}

// Abort test run
async function abortTestRun(testRunId: string): Promise<void> {
  const res = await fetch(`/api/test-runs/${testRunId}/abort`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Failed to abort test run')
  }
}

/**
 * Hook for polling test run status
 * Per PRD 10.3: Polling every 5 sec when status=running/pending
 */
export function useTestRunStatus(testRunId: string | null) {
  return useQuery({
    queryKey: ['test-run', testRunId],
    queryFn: () => fetchTestRun(testRunId!),
    enabled: !!testRunId,
    refetchInterval: (query) => {
      const data = query.state.data
      // Poll every 5 sec while in active states (pending, running, battles_completed, evaluating)
      const activeStates: TestRunStatus[] = ['pending', 'running', 'battles_completed', 'evaluating']
      return data?.status && activeStates.includes(data.status)
        ? 5000
        : false
    },
  })
}

/**
 * Hook for aborting a test run
 * Per PRD 9.1: Kill Switch functionality
 */
export function useAbortTestRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: abortTestRun,
    onSuccess: (_, testRunId) => {
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['test-run', testRunId] })
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
    },
  })
}

/**
 * Hook for listing test runs with optional filtering
 */
export function useTestRuns(filters?: {
  status?: TestRunStatus
  prompt_version_id?: string
  prompt_name?: string
  limit?: number
  order?: 'asc' | 'desc'
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.prompt_version_id) params.set('prompt_version_id', filters.prompt_version_id)
  if (filters?.prompt_name) params.set('prompt_name', filters.prompt_name)
  if (filters?.limit) params.set('limit', filters.limit.toString())
  if (filters?.order) params.set('order', filters.order)

  return useQuery({
    queryKey: ['test-runs', filters],
    queryFn: async () => {
      const res = await fetch(`/api/test-runs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch test runs')
      const response: TestRunsListResponse = await res.json()
      // Normalize all test runs and return just the array
      return response.data.map(normalizeTestRun)
    },
  })
}
