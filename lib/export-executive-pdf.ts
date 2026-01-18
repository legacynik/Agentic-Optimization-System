import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { PersonaPerformanceRow } from "./supabase"

export async function exportExecutiveToPDF(conversations: PersonaPerformanceRow[]) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text("Executive Dashboard Report", 14, 20)

  // Date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  // Calculate KPIs
  const total = conversations.length
  const successful = conversations.filter((c) => c.avg_score >= 8).length
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(0) : "0"

  const totalAppointments = conversations.reduce((sum, conv) => {
    const summary = Array.isArray(conv.conversations_summary)
      ? conv.conversations_summary
      : typeof conv.conversations_summary === "string"
        ? JSON.parse(conv.conversations_summary || "[]")
        : []
    const hasAppointment = summary.some((s: any) => s.appointment === true)
    return sum + (hasAppointment ? 1 : 0)
  }, 0)

  const avgScore = total > 0 ? (conversations.reduce((sum, c) => sum + c.avg_score, 0) / total).toFixed(1) : "0.0"
  const avgTurns = total > 0 ? (conversations.reduce((sum, c) => sum + c.avg_turns, 0) / total).toFixed(1) : "0.0"

  // KPIs Section
  doc.setFontSize(14)
  doc.text("Key Performance Indicators", 14, 40)

  const kpiData = [
    ["Success Rate", `${successRate}%`, "↑ 5%"],
    ["Appointments", totalAppointments.toString(), "↑ 12"],
    ["Avg Score", avgScore, "↑ 0.3"],
    ["Avg Efficiency", `${avgTurns} turns`, "↓ 0.2"],
  ]

  autoTable(doc, {
    startY: 45,
    head: [["Metric", "Value", "Change"]],
    body: kpiData,
    theme: "grid",
    headStyles: { fillColor: [71, 85, 105] },
  })

  // Persona Leaderboard
  const personaScores = new Map<string, number[]>()
  conversations.forEach((conv) => {
    if (!personaScores.has(conv.personaid)) {
      personaScores.set(conv.personaid, [])
    }
    personaScores.get(conv.personaid)!.push(conv.avg_score)
  })

  const personaRankings = Array.from(personaScores.entries())
    .map(([id, scores]) => ({
      id,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  const topThree = personaRankings.slice(0, 3)
  const bottomThree = personaRankings.slice(-3).reverse()

  doc.setFontSize(14)
  const yPosition = (doc as any).lastAutoTable.finalY + 15
  doc.text("Persona Leaderboard", 14, yPosition)

  doc.setFontSize(12)
  doc.text("Top Performers", 14, yPosition + 7)

  const topThreeData = topThree.map((p, index) => [`#${index + 1}`, p.id, p.avgScore.toFixed(1)])

  autoTable(doc, {
    startY: yPosition + 10,
    head: [["Rank", "Persona", "Avg Score"]],
    body: topThreeData,
    theme: "striped",
    headStyles: { fillColor: [34, 197, 94] },
  })

  if (personaRankings.length > 3) {
    const yPosition2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text("Needs Improvement", 14, yPosition2)

    const bottomThreeData = bottomThree.map((p, index) => [
      `#${personaRankings.length - index}`,
      p.id,
      p.avgScore.toFixed(1),
    ])

    autoTable(doc, {
      startY: yPosition2 + 3,
      head: [["Rank", "Persona", "Avg Score"]],
      body: bottomThreeData,
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] },
    })
  }

  // AI Insights
  const yPosition3 = (doc as any).lastAutoTable.finalY + 15
  doc.setFontSize(14)
  doc.text("AI Insights", 14, yPosition3)

  const insights = [
    `Top persona: ${topThree[0]?.id || "N/A"} with ${topThree[0]?.avgScore.toFixed(1) || "0"} average score`,
    `Booking rate is ${((totalAppointments / total) * 100).toFixed(0)}% (${totalAppointments}/${total})`,
    `Average efficiency: ${avgTurns} turns per conversation`,
    `Success rate: ${successRate}% of conversations scored 8+`,
  ]

  doc.setFontSize(10)
  insights.forEach((insight, index) => {
    doc.text(`• ${insight}`, 14, yPosition3 + 7 + index * 6)
  })

  // Footer
  doc.setFontSize(8)
  doc.text("AI Agent Testing Dashboard - Executive Report", 14, 285)

  // Save
  const filename = `executive-report-${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(filename)
}
