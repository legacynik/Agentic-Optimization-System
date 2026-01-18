"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExecutiveKPIs } from "@/components/executive-kpis"
import { PersonaLeaderboard } from "@/components/persona-leaderboard"
import { AppointmentsFunnel } from "@/components/appointments-funnel"
import { AIInsights } from "@/components/ai-insights"
import { SimpleTrends } from "@/components/simple-trends"
import { DateRangePicker } from "@/components/date-range-picker"
import { FileText } from "lucide-react"
import { fetchPersonasPerformance } from "@/lib/queries"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { exportExecutiveToPDF } from "@/lib/export-executive-pdf"
import { toast } from "sonner"

export function ExecutiveDashboard() {
  const [conversations, setConversations] = useState<PersonaPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchPersonasPerformance()
        setConversations(data)
        setError(null)
      } catch (err) {
        console.error("[Executive] Error loading data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredConversations = useMemo(() => {
    if (!dateRange) return conversations

    return conversations.filter((conv) => {
      const testDate = new Date(conv.test_date)
      return testDate >= dateRange.from && testDate <= dateRange.to
    })
  }, [conversations, dateRange])

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      await exportExecutiveToPDF(filteredConversations)
      toast.success("Executive report exported successfully")
    } catch (err) {
      console.error("[Executive] Export error:", err)
      toast.error("Failed to export executive report")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground">Loading executive dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range and Export */}
      <div className="flex items-center justify-between">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Button onClick={handleExportPDF} disabled={exporting}>
          <FileText className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export Report"}
        </Button>
      </div>

      {/* KPI Cards */}
      <ExecutiveKPIs conversations={filteredConversations} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Persona Leaderboard */}
        <PersonaLeaderboard conversations={filteredConversations} />

        {/* Right Column: Funnel + Trends */}
        <div className="space-y-6">
          <AppointmentsFunnel conversations={filteredConversations} />
          <SimpleTrends conversations={filteredConversations} />
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights conversations={filteredConversations} />
    </div>
  )
}
