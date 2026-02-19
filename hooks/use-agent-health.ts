/**
 * Hook for fetching agent health data
 *
 * Provides health metrics for an agent (prompt_name):
 * - Current score from latest test run
 * - Score trend from previous runs
 * - Insight based on performance
 *
 * @module hooks/use-agent-health
 */

import { useQuery } from '@tanstack/react-query'

/** Outcome distribution counts */
export interface OutcomeDistribution {
  success: number
  partial: number
  failure: number
  timeout: number
}

/** Agent health data structure */
export interface AgentHealth {
  /** Latest overall score (0-10) */
  currentScore: number | null
  /** Score change from previous run */
  trend: number | null
  /** Performance insight text */
  insight: string | null
  /** Latest test run ID */
  latestTestRunId: string | null
  /** Number of test runs analyzed */
  testRunsCount: number
  /** Score history for trend visualization */
  scoreHistory: Array<{ score: number; date: string }>
  /** Outcome distribution from latest test run */
  outcomes: OutcomeDistribution | null
}

/** Raw test run data from API */
interface TestRunWithPrompt {
  id: string
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  /** Array of persona UUIDs — length equals total battles planned for the run */
  personas_tested: string[] | null
  completed_at: string | null
  started_at: string
  prompt_versions: {
    prompt_name: string
    version: string
  }
}

/** API response structure */
interface TestRunsResponse {
  data: TestRunWithPrompt[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

/**
 * Generates insight text based on agent performance
 */
function generateInsight(
  currentScore: number | null,
  trend: number | null,
  successRate: number | null
): string | null {
  if (currentScore === null) {
    return null
  }

  // Critical score
  if (currentScore < 6) {
    return 'Performance needs improvement. Consider reviewing failing test cases.'
  }

  // Warning score with negative trend
  if (currentScore < 8 && trend !== null && trend < 0) {
    return 'Score has been declining. Review recent changes to the prompt.'
  }

  // Warning score but improving
  if (currentScore < 8 && trend !== null && trend > 0) {
    return 'Performance is improving but still below target.'
  }

  // Good score with room for improvement
  if (currentScore >= 8 && currentScore < 9) {
    return 'Good performance. Minor optimizations could push score higher.'
  }

  // Excellent score
  if (currentScore >= 9) {
    return 'Excellent performance. Agent is working well.'
  }

  return null
}

/**
 * Fetches agent health data from test runs API
 */
async function fetchAgentHealth(promptName: string): Promise<AgentHealth> {
  // Fetch last 20 test runs to find ones with scores
  // (recent runs may be pending/running with no score yet)
  const params = new URLSearchParams({
    prompt_name: promptName,
    limit: '20',
    order: 'desc',
  })

  const response = await fetch(`/api/test-runs?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch agent health data')
  }

  const data: TestRunsResponse = await response.json()

  // No test runs found
  if (!data.data || data.data.length === 0) {
    return {
      currentScore: null,
      trend: null,
      insight: null,
      latestTestRunId: null,
      testRunsCount: 0,
      scoreHistory: [],
      outcomes: null,
    }
  }

  // Calculate metrics from test runs
  const completedRuns = data.data.filter(
    (run) => run.overall_score !== null
  )

  if (completedRuns.length === 0) {
    return {
      currentScore: null,
      trend: null,
      insight: 'Test runs in progress. Waiting for results.',
      latestTestRunId: data.data[0].id,
      testRunsCount: data.data.length,
      scoreHistory: [],
      outcomes: null,
    }
  }

  const currentScore = completedRuns[0].overall_score
  const previousScore =
    completedRuns.length > 1 ? completedRuns[1].overall_score : null

  // Calculate trend
  const trend =
    currentScore !== null && previousScore !== null
      ? Number((currentScore - previousScore).toFixed(1))
      : null

  // Calculate success rate
  const totalSuccess = completedRuns.reduce((sum, r) => sum + r.success_count, 0)
  const totalFailure = completedRuns.reduce((sum, r) => sum + r.failure_count, 0)
  const successRate =
    totalSuccess + totalFailure > 0
      ? (totalSuccess / (totalSuccess + totalFailure)) * 100
      : null

  // Build score history (most recent first, so reverse for chronological order)
  const scoreHistory = completedRuns
    .filter((r) => r.overall_score !== null)
    .map((r) => ({
      score: r.overall_score as number,
      date: r.completed_at || r.started_at,
    }))
    .reverse()

  // Calculate outcomes from latest run.
  // partial = total_battles - success - failure - timeout
  // total_battles is the number of personas assigned to the run.
  const latestRun = completedRuns[0]
  const successCount = latestRun.success_count || 0
  const failureCount = latestRun.failure_count || 0
  const timeoutCount = latestRun.timeout_count || 0
  const totalBattles = latestRun.personas_tested?.length ?? null
  const partialCount =
    totalBattles !== null
      ? Math.max(0, totalBattles - successCount - failureCount - timeoutCount)
      : 0

  const outcomes: OutcomeDistribution = {
    success: successCount,
    partial: partialCount,
    failure: failureCount,
    timeout: timeoutCount,
  }

  return {
    currentScore,
    trend,
    insight: generateInsight(currentScore, trend, successRate),
    latestTestRunId: completedRuns[0].id,
    testRunsCount: data.pagination.total,
    scoreHistory,
    outcomes,
  }
}

/**
 * Hook for fetching agent health data
 *
 * @param promptName - The agent's prompt_name to fetch health for
 * @returns Query result with agent health data
 */
export function useAgentHealth(promptName: string | null) {
  return useQuery({
    queryKey: ['agent-health', promptName],
    queryFn: () => fetchAgentHealth(promptName!),
    enabled: !!promptName,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refresh every minute
  })
}
