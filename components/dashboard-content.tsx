"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, CheckCircle2, Zap, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { PersonasHeatmap } from "@/components/personas-heatmap"
import { PersonaTestRunsView } from "@/components/persona-testruns-view"
import { FilterBar } from "@/components/filter-bar"
import { ExportMenu } from "@/components/export-menu"
import { AIInsights } from "@/components/ai-insights"
import { SimpleTrends } from "@/components/simple-trends"
import { useState, useEffect, useMemo } from "react"
import { fetchPersonasPerformance, fetchTestRuns, fetchUniquePersonas, fetchHeatmapData } from "@/lib/queries"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { calculateOutliers } from "@/lib/outliers"
import { exportDashboardToCSV } from "@/lib/export-csv"
import { exportDashboardToPDF } from "@/lib/export-pdf"
import { exportDashboardToJSON } from "@/lib/export-json"

// KPI Card component
function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: { value: number; positive: boolean }
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span className={`flex items-center text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}>
              {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardContent() {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([])
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 10])
  const [showBookedOnly, setShowBookedOnly] = useState(false)

  const [conversations, setConversations] = useState<PersonaPerformanceRow[]>([])
  const [testRuns, setTestRuns] = useState<any[]>([])
  const [personas, setPersonas] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /**
     * Loads all dashboard data from personas_performance VIEW
     * Handles empty data gracefully (new installation state)
     */
    async function loadData() {
      console.log("[Dashboard] loadData: Starting...")

      try {
        setLoading(true)

        console.log("[Dashboard] loadData: Fetching all data in parallel...")
        const [conversationsData, testRunsData, personasData, heatmapDataResult] = await Promise.all([
          fetchPersonasPerformance(),
          fetchTestRuns(),
          fetchUniquePersonas(),
          fetchHeatmapData(),
        ])

        console.log("[Dashboard] loadData: All data fetched", {
          conversations: conversationsData?.length || 0,
          testRuns: testRunsData?.length || 0,
          personas: personasData?.length || 0,
          heatmap: heatmapDataResult?.length || 0
        })

        setConversations(conversationsData || [])
        setTestRuns(testRunsData || [])
        setPersonas(personasData || [])
        setHeatmapData(heatmapDataResult || [])
        setError(null)

        console.log("[Dashboard] loadData: State updated, loading complete")
      } catch (err) {
        console.error("[Dashboard] loadData: Error occurred", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        console.log("[Dashboard] loadData: Setting loading=false")
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredConversations = useMemo(() => {
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
        const summary = Array.isArray(row.conversations_summary)
          ? row.conversations_summary
          : typeof row.conversations_summary === "string"
            ? JSON.parse(row.conversations_summary || "[]")
            : []
        return summary.some((conv: any) => conv.appointment_booked === true)
      })
    }

    return filtered
  }, [conversations, selectedPersona, selectedOutcomes, scoreRange, showBookedOnly])

  const outliers = useMemo(() => {
    const scores = filteredConversations.map((row) => row.avg_score)
    return calculateOutliers(scores)
  }, [filteredConversations])

  const kpis = useMemo(() => {
    const totalConversations = filteredConversations.length
    const conversationsWithScores = filteredConversations.filter((row) => row.avg_score != null)
    const successfulConversations = filteredConversations.filter((row) => row.avg_score != null && row.avg_score >= 8).length

    const avgScore =
      conversationsWithScores.length > 0
        ? (conversationsWithScores.reduce((sum, c) => sum + (c.avg_score ?? 0), 0) / conversationsWithScores.length).toFixed(1)
        : "0.0"

    const successRate =
      totalConversations > 0 ? ((successfulConversations / totalConversations) * 100).toFixed(0) : "0"

    const nonTimeoutConversations = filteredConversations.filter((row) => {
      const summary = Array.isArray(row.conversations_summary)
        ? row.conversations_summary
        : typeof row.conversations_summary === "string"
          ? JSON.parse(row.conversations_summary || "[]")
          : []
      return !summary.some((conv: any) => conv.outcome?.toLowerCase() === "timeout")
    })

    const conversationsWithTurns = nonTimeoutConversations.filter((c) => c.avg_turns != null)
    const avgEfficiency =
      conversationsWithTurns.length > 0
        ? (conversationsWithTurns.reduce((sum, c) => sum + (c.avg_turns ?? 0), 0) / conversationsWithTurns.length).toFixed(1)
        : "0.0"

    const totalAppointments = filteredConversations.reduce((sum, row) => {
      const summary = Array.isArray(row.conversations_summary)
        ? row.conversations_summary
        : typeof row.conversations_summary === "string"
          ? JSON.parse(row.conversations_summary || "[]")
          : []
      return sum + (summary.some((conv: any) => conv.appointment_booked === true) ? 1 : 0)
    }, 0)

    return {
      totalConversations,
      successfulConversations,
      avgScore,
      successRate,
      avgEfficiency,
      totalAppointments,
    }
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
  }, [filteredConversations, selectedPersona])

  // Export handlers
  const handleExportCSV = () => {
    const exportKpis = {
      totalConversations: kpis.totalConversations,
      avgScore: parseFloat(kpis.avgScore),
      successRate: parseFloat(kpis.successRate),
      appointmentRate: kpis.totalConversations > 0 ? (kpis.totalAppointments / kpis.totalConversations) * 100 : 0,
    }
    exportDashboardToCSV(filteredConversations, exportKpis)
  }

  const handleExportPDF = () => {
    const exportKpis = {
      totalConversations: kpis.totalConversations,
      avgScore: parseFloat(kpis.avgScore),
      successRate: parseFloat(kpis.successRate),
      appointmentRate: kpis.totalConversations > 0 ? (kpis.totalAppointments / kpis.totalConversations) * 100 : 0,
    }
    exportDashboardToPDF(filteredConversations, exportKpis)
  }

  const handleExportJSON = () => {
    const exportKpis = {
      totalConversations: kpis.totalConversations,
      avgScore: parseFloat(kpis.avgScore),
      successRate: parseFloat(kpis.successRate),
      appointmentRate: kpis.totalConversations > 0 ? (kpis.totalAppointments / kpis.totalConversations) * 100 : 0,
    }
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

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Database Setup Required</CardTitle>
          <CardDescription>
            The database schema needs to be initialized before using the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run the database migration scripts in <code className="bg-muted px-1 py-0.5 rounded">supabase/migrations</code>
            to set up the required tables and views.
          </p>
          <p className="text-xs text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Empty state - no test data yet (valid for new installations)
  if (!loading && conversations.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of your AI agent testing performance
            </p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>No Test Data Yet</CardTitle>
            <CardDescription>
              Run your first test to see performance metrics here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get started by:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Go to <strong>Test Launcher</strong> to configure and run tests</li>
              <li>Create or import <strong>Personas</strong> to test against</li>
              <li>Configure <strong>Settings</strong> with your n8n webhook URLs</li>
            </ol>
            <div className="flex gap-2 pt-4">
              <a href="/test-launcher" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Launch Test
              </a>
              <a href="/settings" className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
                Configure Settings
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
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

      {/* KPI Cards */}
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

      {/* Insights and Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AIInsights conversations={filteredConversations} />
        <SimpleTrends conversations={filteredConversations} />
      </div>

      {/* Filter Bar */}
      <FilterBar
        personas={personas}
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
        selectedOutcomes={selectedOutcomes}
        onOutcomesChange={setSelectedOutcomes}
        scoreRange={scoreRange}
        onScoreRangeChange={setScoreRange}
        showBookedOnly={showBookedOnly}
        onBookedToggle={() => setShowBookedOnly(!showBookedOnly)}
        outliers={outliers}
      />

      {/* Performance View */}
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

      {/* Test Runs and Conversations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Test Runs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Runs</CardTitle>
            <CardDescription>Latest test executions with outcome distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredTestRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium font-mono">{run.id}</p>
                  <p className="text-xs text-muted-foreground">{run.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    {run.distribution.success}
                  </Badge>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                    {run.distribution.partial}
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    {run.distribution.failure}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredTestRuns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No test runs found</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Conversations</CardTitle>
            <CardDescription>Most recent test conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredConversations.slice(0, 5).map((conv) => {
              const firstConv = Array.isArray(conv.conversations_summary) ? conv.conversations_summary[0] : null
              const score = conv.avg_score
              const outcome = score >= 8 ? "success" : score >= 6 ? "partial" : "failure"

              return (
                <div key={conv.conversationid} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate max-w-[200px]">{conv.persona_description}</p>
                    <Badge
                      variant={outcome === "success" ? "default" : outcome === "partial" ? "secondary" : "destructive"}
                    >
                      {conv.avg_score?.toFixed(1) ?? "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {firstConv?.summary || "No summary available"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {conv.avg_turns} turns
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {conv.agentversion}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {filteredConversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
