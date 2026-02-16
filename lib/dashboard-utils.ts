import type { PersonaPerformanceRow } from "@/lib/supabase"
import { parseConversationsSummary } from "@/lib/parsers"

export function filterConversations(
  conversations: PersonaPerformanceRow[],
  selectedPersona: string | null,
  selectedOutcomes: string[],
  scoreRange: [number, number],
  showBookedOnly: boolean
): PersonaPerformanceRow[] {
  let filtered = conversations

  if (selectedPersona !== null) {
    filtered = filtered.filter((row) => row.personaid === selectedPersona)
  }

  filtered = filtered.filter((row) => row.avg_score >= scoreRange[0] && row.avg_score <= scoreRange[1])

  if (selectedOutcomes.length > 0) {
    filtered = filtered.filter((row) => {
      const score = row.avg_score
      if (selectedOutcomes.includes("success") && score >= 8) return true
      if (selectedOutcomes.includes("partial") && score >= 6 && score < 8) return true
      if (selectedOutcomes.includes("failure") && score < 6) return true
      return false
    })
  }

  if (showBookedOnly) {
    filtered = filtered.filter((row) => {
      const summary = parseConversationsSummary(row.conversations_summary)
      return summary.some((conv: any) => conv.appointment_booked === true)
    })
  }

  return filtered
}

export function calculateKPIs(filteredConversations: PersonaPerformanceRow[]) {
  const totalConversations = filteredConversations.length
  const conversationsWithScores = filteredConversations.filter((row) => row.avg_score != null)
  const successfulConversations = filteredConversations.filter((row) => row.avg_score != null && row.avg_score >= 8).length

  const avgScore =
    conversationsWithScores.length > 0
      ? (conversationsWithScores.reduce((sum, c) => sum + (c.avg_score ?? 0), 0) / conversationsWithScores.length).toFixed(1)
      : "0.0"

  const successRate =
    totalConversations > 0 ? ((successfulConversations / totalConversations) * 100).toFixed(0) : "0"

  const totalAppointments = filteredConversations.reduce((sum, row) => {
    const summary = parseConversationsSummary(row.conversations_summary)
    return sum + (summary.some((conv: any) => conv.appointment_booked === true) ? 1 : 0)
  }, 0)

  return {
    totalConversations,
    successfulConversations,
    avgScore,
    successRate,
    totalAppointments,
  }
}

export function buildPersonaTestRunsData(filteredConversations: PersonaPerformanceRow[], selectedPersona: string | null) {
  if (selectedPersona === null) return []

  const testRunsMap = new Map<
    string,
    { testrunid: string; test_date: string; conversations: typeof filteredConversations }
  >()

  filteredConversations.forEach((conv) => {
    if (!testRunsMap.has(conv.testrunid)) {
      testRunsMap.set(conv.testrunid, {
        testrunid: conv.testrunid,
        test_date: conv.test_date || new Date().toISOString(),
        conversations: [],
      })
    }
    testRunsMap.get(conv.testrunid)!.conversations.push(conv)
  })

  return Array.from(testRunsMap.values()).map((testRun) => {
    const avgScore = testRun.conversations.reduce((sum, c) => sum + c.avg_score, 0) / testRun.conversations.length
    const avgTurns = testRun.conversations.reduce((sum, c) => sum + c.avg_turns, 0) / testRun.conversations.length

    const criteriaMap = new Map<string, number[]>()
    testRun.conversations.forEach((conv) => {
      if (Array.isArray(conv.all_criteria_details)) {
        conv.all_criteria_details.forEach((detail: any) => {
          if (!criteriaMap.has(detail.criteria_name)) {
            criteriaMap.set(detail.criteria_name, [])
          }
          criteriaMap.get(detail.criteria_name)!.push(detail.score)
        })
      }
    })

    const evaluation_criteria = Array.from(criteriaMap.entries()).map(([criteria_name, scores]) => ({
      criteria_name,
      score: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    }))

    return {
      testrunid: testRun.testrunid,
      test_date: testRun.test_date,
      avg_score: avgScore,
      avg_turns: avgTurns,
      evaluation_criteria,
    }
  })
}

export function buildExportKPIs(kpis: ReturnType<typeof calculateKPIs>) {
  return {
    totalConversations: kpis.totalConversations,
    avgScore: parseFloat(kpis.avgScore),
    successRate: parseFloat(kpis.successRate),
    appointmentRate: kpis.totalConversations > 0 ? (kpis.totalAppointments / kpis.totalConversations) * 100 : 0,
  }
}
