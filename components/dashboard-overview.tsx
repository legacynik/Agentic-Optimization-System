"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, CheckCircle2, Zap, Calendar } from "lucide-react"
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
import { useDashboardStore } from "@/stores/dashboard-store"

export function DashboardOverview() {
  const {
    selectedPersona: storeSelectedPersona,
    selectedOutcomes: storeSelectedOutcomes,
    scoreRange: storeScoreRange,
    showBookedOnly: storeShowBookedOnly,
  } = useDashboardStore()

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
    async function loadData() {
      try {
        console.log("[v0] Starting to load dashboard data...")
        setLoading(true)
        const [conversationsData, testRunsData, personasData, heatmapDataResult] = await Promise.all([
          fetchPersonasPerformance(),
          fetchTestRuns(),
          fetchUniquePersonas(),
          fetchHeatmapData(),
        ])

        console.log("[v0] Data loaded successfully:", {
          conversations: conversationsData.length,
          testRuns: testRunsData.length,
          personas: personasData.length,
          heatmap: heatmapDataResult.length,
        })

        setConversations(conversationsData)
        setTestRuns(testRunsData)
        setPersonas(personasData)
        setHeatmapData(heatmapDataResult)
        setError(null)
      } catch (err) {
        console.error("[v0] Error loading dashboard data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
        console.log("[v0] Loading complete")
      }
    }

    loadData()
  }, [])

  const filteredConversations = useMemo(() => {
    let filtered = conversations

    if (selectedPersona !== null) {
      filtered = filtered.filter((row) => row.personaid === selectedPersona)
    }

    // Filter by score range
    filtered = filtered.filter((row) => row.avg_score >= scoreRange[0] && row.avg_score <= scoreRange[1])

    // Filter by outcomes (based on score classification)
    if (selectedOutcomes.length > 0) {
      filtered = filtered.filter((row) => {
        const score = row.avg_score
        if (selectedOutcomes.includes("success") && score >= 8) return true
        if (selectedOutcomes.includes("partial") && score >= 6 && score < 8) return true
        if (selectedOutcomes.includes("failure") && score < 6) return true
        return false
      })
    }

    // Filter by booked appointments
    if (showBookedOnly) {
      filtered = filtered.filter((row) => {
        // Parse conversations_summary if it's a string
        const summary = Array.isArray(row.conversations_summary)
          ? row.conversations_summary
          : typeof row.conversations_summary === "string"
            ? JSON.parse(row.conversations_summary || "[]")
            : []

        // Check if any conversation in the summary has appointment_booked: true
        const hasAppointment = summary.some((conv: any) => conv.appointment_booked === true)
        return hasAppointment
      })
    }

    return filtered
  }, [conversations, selectedPersona, selectedOutcomes, scoreRange, showBookedOnly])

  // Calculate outliers from filtered data
  const outliers = useMemo(() => {
    const scores = filteredConversations.map((row) => row.avg_score)
    return calculateOutliers(scores)
  }, [filteredConversations])

  const { totalConversations, successfulConversations, totalTests, avgScore, successRate, avgEfficiency, totalAppointments } =
    useMemo(() => {
      const totalConversations = filteredConversations.length
      const successfulConversations = filteredConversations.filter((row) => row.avg_score >= 8).length

      const totalTests = filteredConversations.length

      const avgScore =
        totalTests > 0
          ? (filteredConversations.reduce((sum, c) => sum + c.avg_score, 0) / totalTests).toFixed(1)
          : "0.0"

      const successRate =
        totalConversations > 0 ? ((successfulConversations / totalConversations) * 100).toFixed(0) : "0"

      const nonTimeoutConversations = filteredConversations.filter((row) => {
        const summary = Array.isArray(row.conversations_summary)
          ? row.conversations_summary
          : typeof row.conversations_summary === "string"
            ? JSON.parse(row.conversations_summary || "[]")
            : []
        const hasTimeout = summary.some((conv: any) => conv.outcome?.toLowerCase() === "timeout")
        return !hasTimeout
      })

      const avgEfficiency =
        nonTimeoutConversations.length > 0
          ? (nonTimeoutConversations.reduce((sum, c) => sum + c.avg_turns, 0) / nonTimeoutConversations.length).toFixed(
            1,
          )
          : "0.0"

      // Calculate total appointments booked
      const totalAppointments = filteredConversations.reduce((sum, row) => {
        const summary = Array.isArray(row.conversations_summary)
          ? row.conversations_summary
          : typeof row.conversations_summary === "string"
            ? JSON.parse(row.conversations_summary || "[]")
            : []

        const hasAppointment = summary.some((conv: any) => conv.appointment_booked === true)
        return sum + (hasAppointment ? 1 : 0)
      }, 0)

      return {
        totalConversations,
        successfulConversations,
        totalTests,
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
    if (selectedPersona === null) {
      return heatmapData
    }

    const selectedPersonaDescription = personas.find((p) => p.id === selectedPersona)?.name

    if (!selectedPersonaDescription) {
      return heatmapData
    }

    const filtered = heatmapData.filter((row) => {
      return row.persona.includes(selectedPersonaDescription.split("...")[0])
    })

    return filtered
  }, [heatmapData, selectedPersona, personas])

  const personaTestRunsData = useMemo(() => {
    if (selectedPersona === null) return []

    // Group conversations by testrunid
    const testRunsMap = new Map<
      string,
      {
        testrunid: string
        test_date: string
        conversations: typeof filteredConversations
      }
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

    // Transform into the format expected by PersonaTestRunsView
    return Array.from(testRunsMap.values()).map((testRun) => {
      // Calculate average score and turns across all conversations in this test run
      const avgScore = testRun.conversations.reduce((sum, c) => sum + c.avg_score, 0) / testRun.conversations.length
      const avgTurns = testRun.conversations.reduce((sum, c) => sum + c.avg_turns, 0) / testRun.conversations.length

      // Aggregate criteria scores across all conversations
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

      // Calculate average score for each criterion
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    const isSchemaError = error.includes("does not exist") || error.includes("column")

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl">
              {isSchemaError ? "Database Setup Required" : "Error Loading Data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSchemaError ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your Supabase connection is working, but the{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">personas_performance</code> view hasn't been set up
                  yet.
                </p>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-foreground">To set up your database:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      Look for the <code className="bg-muted px-1 py-0.5 rounded">scripts</code> folder in the file tree
                      on the left
                    </li>
                    <li>
                      Open <code className="bg-muted px-1 py-0.5 rounded">01-create-personas-performance-view.sql</code>
                    </li>
                    <li>
                      Click the <strong>Run</strong> button to create the database schema
                    </li>
                    <li>
                      Open <code className="bg-muted px-1 py-0.5 rounded">02-seed-sample-data.sql</code>
                    </li>
                    <li>
                      Click the <strong>Run</strong> button to add sample data
                    </li>
                    <li>Refresh this page to see your dashboard</li>
                  </ol>
                </div>

                <p className="text-xs text-muted-foreground">
                  The scripts will create the required tables and views with sample test data. Once you have real data,
                  you can replace the sample data with your own.
                </p>
              </>
            ) : (
              <>
                <p className="text-destructive font-semibold">{error}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  Make sure you've added your Supabase credentials in Project Settings (gear icon in top right):
                  <br />• NEXT_PUBLIC_SUPABASE_URL
                  <br />• NEXT_PUBLIC_SUPABASE_ANON_KEY
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Export handlers
  const handleExportCSV = () => {
    const kpis = {
      totalConversations,
      avgScore: parseFloat(avgScore),
      successRate: parseFloat(successRate),
      appointmentRate: totalConversations > 0 ? (totalAppointments / totalConversations) * 100 : 0
    }
    exportDashboardToCSV(filteredConversations, kpis)
  }

  const handleExportPDF = () => {
    const kpis = {
      totalConversations,
      avgScore: parseFloat(avgScore),
      successRate: parseFloat(successRate),
      appointmentRate: totalConversations > 0 ? (totalAppointments / totalConversations) * 100 : 0
    }
    exportDashboardToPDF(filteredConversations, kpis)
  }

  const handleExportJSON = () => {
    const kpis = {
      totalConversations,
      avgScore: parseFloat(avgScore),
      successRate: parseFloat(successRate),
      appointmentRate: totalConversations > 0 ? (totalAppointments / totalConversations) * 100 : 0
    }
    const filters = {
      selectedPersona,
      selectedOutcomes,
      scoreRange,
      showBookedOnly
    }
    exportDashboardToJSON(filteredConversations, kpis, filters)
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <ExportMenu
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onExportJSON={handleExportJSON}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalTests}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {filteredTestRuns.length} test runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of 10.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Successful outcomes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalConversations > 0 ? `${((totalAppointments / totalConversations) * 100).toFixed(1)}% booking rate` : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{avgEfficiency}</div>
            <p className="text-xs text-muted-foreground mt-1">Turns per conversation (excl. timeouts)</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedPersona !== null ? "Persona Performance History" : "Personas Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPersona !== null ? (
            // Show test runs view when a persona is selected
            <PersonaTestRunsView
              personaId={selectedPersona}
              personaName={personas.find((p) => p.id === selectedPersona)?.name || selectedPersona}
              data={personaTestRunsData}
            />
          ) : (
            // Show heatmap when no persona is selected
            <PersonasHeatmap data={filteredHeatmapData} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Runs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTestRuns.slice(0, 5).map((run) => (
              <Card key={run.id} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-foreground">{run.id}</span>
                    <Badge variant="secondary">{run.avgScore}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{run.date}</p>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary">
                      {run.distribution.success} success
                    </Badge>
                    <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent">
                      {run.distribution.partial} partial
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-destructive/20 text-destructive-foreground border-destructive"
                    >
                      {run.distribution.failure} fail
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Latest Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredConversations.slice(0, 3).map((conv) => {
              const firstConv = Array.isArray(conv.conversations_summary) ? conv.conversations_summary[0] : null
              const score = conv.avg_score
              const outcome = score >= 8 ? "success" : score >= 6 ? "partial" : "failure"

              return (
                <Card key={conv.conversationid} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-xs text-muted-foreground">{conv.conversationid}</span>
                      <Badge
                        variant={
                          outcome === "success" ? "default" : outcome === "partial" ? "secondary" : "destructive"
                        }
                        className="text-xs"
                      >
                        {conv.avg_score}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground font-medium mb-1">{conv.persona_description}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{firstConv?.summary || "No summary"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {conv.personaid}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conv.avg_turns} turns
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conv.agentversion}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
