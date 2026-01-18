import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PersonaPerformanceRow } from './supabase'

/**
 * Export conversations data to PDF format
 */
export function exportConversationsToPDF(conversations: PersonaPerformanceRow[], filename?: string) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('Conversations Report', 14, 20)

  // Metadata
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  doc.text(`Total Conversations: ${conversations.length}`, 14, 34)

  // Table
  const tableData = conversations.map((conv) => [
    String(conv.conversationid),
    conv.personaid,
    conv.persona_category || 'N/A',
    new Date(conv.test_date).toLocaleDateString(),
    conv.avg_score.toFixed(2),
    conv.conversations_summary?.[0]?.appointment_booked ? 'Yes' : 'No',
    conv.conversations_summary?.[0]?.outcome || 'N/A',
  ])

  autoTable(doc, {
    head: [['Conv ID', 'Persona', 'Category', 'Date', 'Score', 'Booked', 'Outcome']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  doc.save(filename || `conversations-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export dashboard overview to PDF
 */
export function exportDashboardToPDF(
  conversations: PersonaPerformanceRow[],
  kpis: {
    totalConversations: number
    avgScore: number
    successRate: number
    appointmentRate: number
  },
  filename?: string
) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Dashboard Overview Report', 14, 20)

  // Date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  // KPIs Section
  doc.setFontSize(14)
  doc.text('Key Performance Indicators', 14, 40)

  const kpiData = [
    ['Total Conversations', String(kpis.totalConversations)],
    ['Average Score', kpis.avgScore.toFixed(2)],
    ['Success Rate', `${kpis.successRate.toFixed(1)}%`],
    ['Appointment Rate', `${kpis.appointmentRate.toFixed(1)}%`],
  ]

  autoTable(doc, {
    head: [['Metric', 'Value']],
    body: kpiData,
    startY: 45,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 197, 94] },
    margin: { left: 14, right: 14 },
  })

  // Conversations Table
  const finalY = (doc as any).lastAutoTable.finalY || 80
  doc.setFontSize(14)
  doc.text('Conversations', 14, finalY + 15)

  const tableData = conversations.map((conv) => [
    String(conv.conversationid),
    conv.personaid,
    conv.persona_category || 'N/A',
    new Date(conv.test_date).toLocaleDateString(),
    conv.avg_score.toFixed(2),
    conv.conversations_summary?.[0]?.appointment_booked ? 'Yes' : 'No',
  ])

  autoTable(doc, {
    head: [['Conv ID', 'Persona', 'Category', 'Date', 'Score', 'Booked']],
    body: tableData,
    startY: finalY + 20,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  doc.save(filename || `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export criteria comparison to PDF
 */
export function exportCriteriaToPDF(
  conversations: PersonaPerformanceRow[],
  criteriaMatrix: { criteriaName: string; scores: Record<string, number> }[],
  filename?: string
) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('Criteria Comparison Report', 14, 20)

  // Metadata
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  doc.text(`Comparing ${conversations.length} Conversations`, 14, 34)

  // Conversation IDs
  doc.text(
    `Conversations: ${conversations.map((c) => c.conversationid).join(', ')}`,
    14,
    40
  )

  // Table
  const headers = ['Criteria', ...conversations.map((c) => `Conv ${c.conversationid}`)]
  const tableData = criteriaMatrix.map((row) => [
    row.criteriaName,
    ...conversations.map((c) => row.scores[String(c.conversationid)].toFixed(1)),
  ])

  // Add average row
  const avgRow = [
    'Average',
    ...conversations.map((c) => c.avg_score.toFixed(1)),
  ]
  tableData.push(avgRow)

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 48,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    didParseCell: (data) => {
      // Highlight average row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [243, 244, 246]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  doc.save(filename || `criteria-comparison-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export executive summary to PDF
 */
export function exportExecutiveSummaryToPDF(
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
  const doc = new jsPDF()

  // Title
  doc.setFontSize(22)
  doc.text('Executive Summary', 14, 20)

  // Date
  doc.setFontSize(10)
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 28)

  // KPIs Section
  doc.setFontSize(16)
  doc.text('Key Metrics', 14, 42)

  const kpiData = [
    ['Total Conversations', String(kpis.totalConversations)],
    ['Average Score', kpis.avgScore.toFixed(2)],
    ['Success Rate', `${kpis.successRate.toFixed(1)}%`],
    ['Appointment Rate', `${kpis.appointmentRate.toFixed(1)}%`],
  ]

  autoTable(doc, {
    body: kpiData,
    startY: 48,
    styles: { fontSize: 12, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 40 },
    },
    theme: 'plain',
  })

  // Top Performers
  let finalY = (doc as any).lastAutoTable.finalY || 100
  doc.setFontSize(16)
  doc.text('Top Performers', 14, finalY + 15)

  const topData = topPersonas.map((p) => [p.personaid, p.avgScore.toFixed(2)])

  autoTable(doc, {
    head: [['Persona', 'Avg Score']],
    body: topData,
    startY: finalY + 20,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  // Bottom Performers
  finalY = (doc as any).lastAutoTable.finalY || 140
  doc.setFontSize(16)
  doc.text('Areas for Improvement', 14, finalY + 15)

  const bottomData = bottomPersonas.map((p) => [p.personaid, p.avgScore.toFixed(2)])

  autoTable(doc, {
    head: [['Persona', 'Avg Score']],
    body: bottomData,
    startY: finalY + 20,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [239, 68, 68] },
  })

  doc.save(filename || `executive-summary-${new Date().toISOString().split('T')[0]}.pdf`)
}
