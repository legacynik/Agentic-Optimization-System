import type { PersonaPerformanceRow } from './supabase'

/**
 * Export conversations data to JSON format
 */
export function exportConversationsToJSON(conversations: PersonaPerformanceRow[], filename?: string) {
  const data = conversations.map((conv) => ({
    conversationId: conv.conversationid,
    testRunId: conv.testrunid,
    personaId: conv.personaid,
    personaDescription: conv.persona_description,
    personaCategory: conv.persona_category,
    testDate: conv.test_date,
    avgScore: conv.avg_score,
    transcript: conv.conversations_transcripts,
    summary: conv.conversations_summary,
    criteriaDetails: conv.all_criteria_details,
  }))

  downloadJSON(data, filename || `conversations-${new Date().toISOString().split('T')[0]}.json`)
}

/**
 * Export criteria comparison data to JSON
 */
export function exportCriteriaToJSON(
  conversations: PersonaPerformanceRow[],
  criteriaMatrix: { criteriaName: string; scores: Record<string, number> }[],
  filename?: string
) {
  const data = {
    exportDate: new Date().toISOString(),
    conversationIds: conversations.map((c) => c.conversationid),
    conversations: conversations.map((c) => ({
      conversationId: c.conversationid,
      personaId: c.personaid,
      avgScore: c.avg_score,
    })),
    criteriaMatrix: criteriaMatrix.map((row) => ({
      criteriaName: row.criteriaName,
      scores: row.scores,
    })),
  }

  downloadJSON(data, filename || `criteria-comparison-${new Date().toISOString().split('T')[0]}.json`)
}

/**
 * Export dashboard overview data to JSON
 */
export function exportDashboardToJSON(
  conversations: PersonaPerformanceRow[],
  kpis: {
    totalConversations: number
    avgScore: number
    successRate: number
    appointmentRate: number
  },
  filters: {
    dateRange?: [Date, Date]
    selectedPersona?: string | null
    selectedOutcomes?: string[]
    scoreRange?: [number, number]
    showBookedOnly?: boolean
  },
  filename?: string
) {
  const data = {
    exportDate: new Date().toISOString(),
    kpis,
    filters: {
      ...filters,
      dateRange: filters.dateRange?.map((d) => d.toISOString()),
    },
    conversations: conversations.map((conv) => ({
      conversationId: conv.conversationid,
      testRunId: conv.testrunid,
      personaId: conv.personaid,
      personaCategory: conv.persona_category,
      testDate: conv.test_date,
      avgScore: conv.avg_score,
      appointmentBooked: conv.conversations_summary?.[0]?.appointment_booked,
      outcome: conv.conversations_summary?.[0]?.outcome,
      humanNotes: conv.conversations_summary?.[0]?.human_notes,
    })),
  }

  downloadJSON(data, filename || `dashboard-export-${new Date().toISOString().split('T')[0]}.json`)
}

/**
 * Export executive summary to JSON
 */
export function exportExecutiveSummaryToJSON(
  kpis: {
    totalConversations: number
    avgScore: number
    successRate: number
    appointmentRate: number
  },
  topPersonas: { personaid: string; avgScore: number }[],
  bottomPersonas: { personaid: string; avgScore: number }[],
  filename?: string
) {
  const data = {
    exportDate: new Date().toISOString(),
    reportType: 'executive-summary',
    kpis,
    topPerformers: topPersonas,
    areasForImprovement: bottomPersonas,
  }

  downloadJSON(data, filename || `executive-summary-${new Date().toISOString().split('T')[0]}.json`)
}

/**
 * Helper to trigger JSON download
 */
function downloadJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
