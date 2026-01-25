/**
 * Hook for fetching detailed agent analysis data
 *
 * Provides extended metrics for agent details view:
 * - Top issues (from failure_patterns)
 * - Personas outliers (struggling and excelling)
 * - Score trend data
 *
 * @module hooks/use-agent-details
 */

import { useQuery } from '@tanstack/react-query'

/** Persona score summary */
export interface PersonaScore {
  id: string
  name: string
  category: string
  avgScore: number
  battleCount: number
}

/** Prompt suggestion from analysis_report */
export interface PromptSuggestion {
  id: string
  action: 'ADD' | 'MODIFY' | 'REMOVE'
  text: string
  priority: 'high' | 'medium' | 'low'
}

/** Agent details data structure */
export interface AgentDetails {
  /** Top issues from failure_patterns */
  topIssues: string[]
  /** Bottom performing personas */
  strugglingPersonas: PersonaScore[]
  /** Top performing personas */
  excellingPersonas: PersonaScore[]
  /** Latest test run ID for optimization */
  latestTestRunId: string | null
  /** AI-generated suggestions for prompt improvement */
  suggestions: PromptSuggestion[]
  /** Executive summary from analysis */
  executiveSummary: string | null
  /** Failure patterns raw data */
  failurePatterns: unknown
  /** Strengths raw data */
  strengths: unknown
  /** Weaknesses raw data */
  weaknesses: unknown
}

/** Analysis report structure from LLM */
interface AnalysisReport {
  executive_summary?: string
  insights?: Array<{
    title: string
    description: string
    evidence?: string[]
    impact?: string
    affected_personas?: string[]
    recommendation?: string
  }>
  persona_breakdown?: {
    struggling?: Array<{ name: string; avg_score: number; root_cause?: string }>
    excelling?: Array<{ name: string; avg_score: number; why?: string }>
  }
  strengths?: string[]
  prompt_suggestions?: Array<{
    id: string
    action: 'ADD' | 'MODIFY' | 'REMOVE'
    text: string
    priority: 'high' | 'medium' | 'low'
  }>
}

/** Raw test run response */
interface TestRunResponse {
  id: string
  overall_score: number | null
  failure_patterns: unknown
  strengths: unknown
  weaknesses: unknown
  analysis_report: AnalysisReport | null
  battle_results: Array<{
    id: string
    persona_id: string
    persona_name: string
    persona_category: string
    outcome: string
    score: number | null
  }>
}

/**
 * Extracts top issues from failure_patterns
 * Handles various formats the data might come in
 */
function extractTopIssues(failurePatterns: unknown): string[] {
  if (!failurePatterns) return []

  // If it's an array of strings
  if (Array.isArray(failurePatterns)) {
    return failurePatterns
      .filter((item): item is string => typeof item === 'string')
      .slice(0, 5)
  }

  // If it's an object with 'issues' or 'patterns' array
  if (typeof failurePatterns === 'object') {
    const fp = failurePatterns as Record<string, unknown>

    if (Array.isArray(fp.issues)) {
      return fp.issues
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 5)
    }

    if (Array.isArray(fp.patterns)) {
      return fp.patterns
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 5)
    }

    // If it's an object with string values (pattern_name: description)
    const values = Object.values(fp)
      .filter((v): v is string => typeof v === 'string')
      .slice(0, 5)
    if (values.length > 0) return values
  }

  return []
}

/**
 * Calculates persona score aggregations from battle results
 */
function calculatePersonaScores(
  battleResults: TestRunResponse['battle_results']
): { struggling: PersonaScore[]; excelling: PersonaScore[] } {
  // Group by persona and calculate averages
  const personaMap = new Map<
    string,
    { name: string; category: string; scores: number[] }
  >()

  for (const battle of battleResults) {
    if (battle.score === null) continue

    const existing = personaMap.get(battle.persona_id)
    if (existing) {
      existing.scores.push(battle.score)
    } else {
      personaMap.set(battle.persona_id, {
        name: battle.persona_name,
        category: battle.persona_category,
        scores: [battle.score],
      })
    }
  }

  // Convert to array and calculate averages
  const personaScores: PersonaScore[] = Array.from(personaMap.entries()).map(
    ([id, data]) => ({
      id,
      name: data.name,
      category: data.category,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      battleCount: data.scores.length,
    })
  )

  // Sort by score
  const sorted = [...personaScores].sort((a, b) => a.avgScore - b.avgScore)

  return {
    struggling: sorted.slice(0, 3), // Bottom 3
    excelling: sorted.slice(-3).reverse(), // Top 3
  }
}

/**
 * Fetches agent details from the latest test run
 */
async function fetchAgentDetails(promptName: string): Promise<AgentDetails> {
  // First get latest test run ID
  const listParams = new URLSearchParams({
    prompt_name: promptName,
    limit: '1',
    order: 'desc',
  })

  const listResponse = await fetch(`/api/test-runs?${listParams.toString()}`)
  if (!listResponse.ok) {
    throw new Error('Failed to fetch test runs')
  }

  const listData = await listResponse.json()
  if (!listData.data || listData.data.length === 0) {
    return {
      topIssues: [],
      strugglingPersonas: [],
      excellingPersonas: [],
      latestTestRunId: null,
      suggestions: [],
      executiveSummary: null,
      failurePatterns: null,
      strengths: null,
      weaknesses: null,
    }
  }

  const latestTestRunId = listData.data[0].id

  // Fetch full test run details
  const detailResponse = await fetch(`/api/test-runs/${latestTestRunId}`)
  if (!detailResponse.ok) {
    throw new Error('Failed to fetch test run details')
  }

  const testRun: TestRunResponse = await detailResponse.json()

  // Extract top issues - prefer analysis_report insights, fallback to failure_patterns
  let topIssues: string[] = []
  if (testRun.analysis_report?.insights) {
    topIssues = testRun.analysis_report.insights
      .map(i => i.title || i.description)
      .slice(0, 5)
  } else {
    topIssues = extractTopIssues(testRun.failure_patterns)
  }

  // Calculate persona outliers
  const { struggling, excelling } = calculatePersonaScores(
    testRun.battle_results || []
  )

  // Extract suggestions from analysis_report
  const suggestions: PromptSuggestion[] = testRun.analysis_report?.prompt_suggestions || []

  return {
    topIssues,
    strugglingPersonas: struggling,
    excellingPersonas: excelling,
    latestTestRunId: testRun.id,
    suggestions,
    executiveSummary: testRun.analysis_report?.executive_summary || null,
    failurePatterns: testRun.failure_patterns,
    strengths: testRun.strengths,
    weaknesses: testRun.weaknesses,
  }
}

/**
 * Hook for fetching agent details
 *
 * @param promptName - The agent's prompt_name to fetch details for
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with agent details data
 */
export function useAgentDetails(promptName: string | null, enabled = true) {
  return useQuery({
    queryKey: ['agent-details', promptName],
    queryFn: () => fetchAgentDetails(promptName!),
    enabled: !!promptName && enabled,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: false, // Don't auto-refresh details
  })
}
