"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp, CheckCircle2, Calendar } from "lucide-react"
import { PersonasHeatmap } from "@/components/personas-heatmap"
import { PersonaTestRunsView } from "@/components/persona-testruns-view"
import { FilterBar } from "@/components/filter-bar"
import { ExportMenu } from "@/components/export-menu"
import { AIInsights } from "@/components/ai-insights"
import { SimpleTrends } from "@/components/simple-trends"
import { KPICard } from "@/components/dashboard/kpi-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { DashboardError } from "@/components/dashboard/dashboard-error"
import { TestRunsCard } from "@/components/dashboard/test-runs-card"
import { LatestConversationsCard } from "@/components/dashboard/latest-conversations-card"
import { useMemo } from "react"
import { useConversationsQuery, useTestRunsQuery, usePersonasQuery, useHeatmapQuery } from "@/hooks/queries"
import { useDashboardStore } from "@/stores/dashboard-store"
import { calculateOutliers } from "@/lib/outliers"
import { exportDashboardToCSV } from "@/lib/export-csv"
import { exportDashboardToPDF } from "@/lib/export-pdf"
import { exportDashboardToJSON } from "@/lib/export-json"
import {
  filterConversations,
  calculateKPIs,
  buildPersonaTestRunsData,
  buildExportKPIs,
} from "@/lib/dashboard-utils"

export function DashboardContent() {
  const selectedPersona = useDashboardStore((s) => s.selectedPersona)
  const setSelectedPersona = useDashboardStore((s) => s.setSelectedPersona)
  const selectedOutcomes = useDashboardStore((s) => s.selectedOutcomes)
  const scoreRange = useDashboardStore((s) => s.scoreRange)
  const setScoreRange = useDashboardStore((s) => s.setScoreRange)
  const showBookedOnly = useDashboardStore((s) => s.showBookedOnly)
  const toggleShowBooked = useDashboardStore((s) => s.toggleShowBooked)

  const { data: conversations = [], isLoading: convLoading, error: convError } = useConversationsQuery()
  const { data: testRuns = [], isLoading: trLoading } = useTestRunsQuery()
  const { data: personas = [], isLoading: pLoading } = usePersonasQuery()
  const { data: heatmapData = [], isLoading: hmLoading } = useHeatmapQuery()

  const loading = convLoading || trLoading || pLoading || hmLoading
  const error = convError ? (convError instanceof Error ? convError.message : "Failed to load data") : null

  const handleOutcomesChange = (outcomes: string[]) => {
    const store = useDashboardStore.getState()
    // Sync full array — clear then set
    store.selectedOutcomes.forEach((o) => {
      if (!outcomes.includes(o)) store.toggleOutcome(o)
    })
    outcomes.forEach((o) => {
      if (!store.selectedOutcomes.includes(o)) store.toggleOutcome(o)
    })
  }

  const filteredConversations = useMemo(() => {
    return filterConversations(
      conversations,
      selectedPersona,
      selectedOutcomes,
      scoreRange,
      showBookedOnly
    )
  }, [conversations, selectedPersona, selectedOutcomes, scoreRange, showBookedOnly])

  const outliers = useMemo(() => {
    const scores = filteredConversations.map((row) => row.avg_score)
    return calculateOutliers(scores)
  }, [filteredConversations])

  const kpis = useMemo(() => {
    return calculateKPIs(filteredConversations)
  }, [filteredConversations])

  const filteredTestRuns = useMemo(() => {
    const testrunIds = new Set(filteredConversations.map((c) => c.testrunid))
    return testRuns.filter((run) => testrunIds.has(run.id))
  }, [testRuns, filteredConversations])

  const filteredHeatmapData = useMemo(() => {
    if (selectedPersona === null) return heatmapData
    const selectedPersonaDescription = personas.find((p) => p.id === selectedPersona)?.name
    if (!selectedPersonaDescription) return heatmapData
    return heatmapData.filter((row) => row.persona.includes(selectedPersonaDescription.split("...")[0]))
  }, [heatmapData, selectedPersona, personas])

  const personaTestRunsData = useMemo(() => {
    return buildPersonaTestRunsData(filteredConversations, selectedPersona)
  }, [filteredConversations, selectedPersona])

  const handleExportCSV = () => {
    const exportKpis = buildExportKPIs(kpis)
    exportDashboardToCSV(filteredConversations, exportKpis)
  }

  const handleExportPDF = () => {
    const exportKpis = buildExportKPIs(kpis)
    exportDashboardToPDF(filteredConversations, exportKpis)
  }

  const handleExportJSON = () => {
    const exportKpis = buildExportKPIs(kpis)
    exportDashboardToJSON(filteredConversations, exportKpis, {
      selectedPersona,
      selectedOutcomes,
      scoreRange,
      showBookedOnly,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    )
  }

  if (error) return <DashboardError error={error} />
  if (!loading && conversations.length === 0) return <EmptyState />

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your AI agent testing performance
          </p>
        </div>
        <ExportMenu
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onExportJSON={handleExportJSON}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Tests"
          value={kpis.totalConversations}
          description={`Across ${filteredTestRuns.length} test runs`}
          icon={Activity}
        />
        <KPICard
          title="Avg Score"
          value={kpis.avgScore}
          description="Out of 10.0"
          icon={TrendingUp}
        />
        <KPICard
          title="Success Rate"
          value={`${kpis.successRate}%`}
          description="Score >= 8"
          icon={CheckCircle2}
        />
        <KPICard
          title="Appointments"
          value={kpis.totalAppointments}
          description={
            kpis.totalConversations > 0
              ? `${((kpis.totalAppointments / kpis.totalConversations) * 100).toFixed(1)}% booking rate`
              : "No data"
          }
          icon={Calendar}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AIInsights conversations={filteredConversations} />
        <SimpleTrends conversations={filteredConversations} />
      </div>

      <FilterBar
        personas={personas}
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
        selectedOutcomes={selectedOutcomes}
        onOutcomesChange={handleOutcomesChange}
        scoreRange={scoreRange}
        onScoreRangeChange={setScoreRange}
        showBookedOnly={showBookedOnly}
        onBookedToggle={toggleShowBooked}
        outliers={outliers}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedPersona !== null ? "Persona Performance History" : "Personas Performance"}
          </CardTitle>
          <CardDescription>
            {selectedPersona !== null
              ? "Historical test results for selected persona"
              : "Performance heatmap across all personas and criteria"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedPersona !== null ? (
            <PersonaTestRunsView
              personaId={selectedPersona}
              personaName={personas.find((p) => p.id === selectedPersona)?.name || selectedPersona}
              data={personaTestRunsData}
            />
          ) : (
            <PersonasHeatmap data={filteredHeatmapData} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TestRunsCard testRuns={filteredTestRuns} />
        <LatestConversationsCard conversations={filteredConversations} />
      </div>
    </div>
  )
}
