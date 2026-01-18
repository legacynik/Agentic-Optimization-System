import { unparse } from 'papaparse'
import type { PersonaPerformanceRow } from './supabase'

/**
 * Export conversations data to CSV format
 */
export function exportConversationsToCSV(conversations: PersonaPerformanceRow[], filename?: string) {
  const data = conversations.map((conv) => ({
    'Conversation ID': conv.conversationid,
    'Test Run ID': conv.testrunid,
    'Persona ID': conv.personaid,
    'Persona Category': conv.persona_category,
    'Test Date': new Date(conv.test_date).toLocaleDateString(),
    'Average Score': conv.avg_score.toFixed(2),
    'Appointment Booked': conv.conversations_summary?.[0]?.appointment_booked ? 'Yes' : 'No',
    'Outcome': conv.conversations_summary?.[0]?.outcome || 'N/A',
    'Human Notes': conv.conversations_summary?.[0]?.human_notes || '',
  }))

  const csv = unparse(data)
  downloadCSV(csv, filename || `conversations-${new Date().toISOString().split('T')[0]}.csv`)
}

/**
 * Export criteria comparison data to CSV
 */
export function exportCriteriaToCSV(
  conversations: PersonaPerformanceRow[],
  criteriaMatrix: { criteriaName: string; scores: Record<string, number> }[],
  filename?: string
) {
  const headers = ['Criteria', ...conversations.map((c) => `Conv ${c.conversationid}`)]
  const rows = criteriaMatrix.map((row) => [
    row.criteriaName,
    ...conversations.map((c) => row.scores[String(c.conversationid)]),
  ])

  const data = [headers, ...rows].map((row) => row.join(','))
  const csv = data.join('\n')
  downloadCSV(csv, filename || `criteria-comparison-${new Date().toISOString().split('T')[0]}.csv`)
}

/**
 * Export dashboard overview data to CSV
 */
export function exportDashboardToCSV(
  conversations: PersonaPerformanceRow[],
  kpis: {
    totalConversations: number
    avgScore: number
    successRate: number
    appointmentRate: number
  },
  filename?: string
) {
  // KPIs section
  const kpiData = [
    ['KPI', 'Value'],
    ['Total Conversations', kpis.totalConversations],
    ['Average Score', kpis.avgScore.toFixed(2)],
    ['Success Rate', `${kpis.successRate.toFixed(1)}%`],
    ['Appointment Rate', `${kpis.appointmentRate.toFixed(1)}%`],
    [],
  ]

  // Conversations section
  const convHeaders = [
    'Conversation ID',
    'Persona ID',
    'Category',
    'Date',
    'Score',
    'Booked',
    'Outcome',
  ]
  const convData = conversations.map((conv) => [
    conv.conversationid,
    conv.personaid,
    conv.persona_category,
    new Date(conv.test_date).toLocaleDateString(),
    conv.avg_score.toFixed(2),
    conv.conversations_summary?.[0]?.appointment_booked ? 'Yes' : 'No',
    conv.conversations_summary?.[0]?.outcome || 'N/A',
  ])

  const allData = [...kpiData, convHeaders, ...convData]
  const csv = allData.map((row) => row.join(',')).join('\n')
  downloadCSV(csv, filename || `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`)
}

/**
 * Helper to trigger CSV download
 */
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
