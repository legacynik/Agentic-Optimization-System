"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface ConversationEvaluationProps {
  conversation: PersonaPerformanceRow
  allConversations?: PersonaPerformanceRow[]
  loading?: boolean
  error?: string
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400"
  if (score >= 6) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

function getScoreBgGradient(score: number): string {
  if (score >= 8) return "bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/50"
  if (score >= 6) return "bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/50"
  return "bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/50"
}

function getProgressColor(score: number): string {
  if (score >= 8) return "[&>div]:bg-green-600 dark:[&>div]:bg-green-500"
  if (score >= 6) return "[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-500"
  return "[&>div]:bg-red-600 dark:[&>div]:bg-red-500"
}

export function ConversationEvaluation({ conversation, allConversations = [], loading = false, error }: ConversationEvaluationProps) {
  const [sortBy, setSortBy] = useState<"name" | "score">("score")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [chartView, setChartView] = useState<"all" | "persona" | "global">("all")

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-background via-background to-muted/10 p-6">
        <Skeleton className="h-[200px] w-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Evaluation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Empty state - no criteria
  if (!conversation.all_criteria_details || conversation.all_criteria_details.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No evaluation criteria available for this conversation.
        </CardContent>
      </Card>
    )
  }

  const { personaAvg, globalAvg, criteriaComparison } = useMemo(() => {
    try {
      if (!allConversations || allConversations.length === 0) {
        return { personaAvg: {}, globalAvg: {}, criteriaComparison: [] }
      }

      const personaConversations = allConversations.filter((c) => c.personaid === conversation.personaid)

    // Calculate persona averages
    const personaCriteriaMap = new Map<string, number[]>()
    personaConversations.forEach((conv) => {
      conv.all_criteria_details?.forEach((criteria) => {
        if (!personaCriteriaMap.has(criteria.criteria_name)) {
          personaCriteriaMap.set(criteria.criteria_name, [])
        }
        personaCriteriaMap.get(criteria.criteria_name)!.push(criteria.score)
      })
    })

    const personaAvg: Record<string, number> = {}
    personaCriteriaMap.forEach((scores, name) => {
      personaAvg[name] = scores.reduce((a, b) => a + b, 0) / scores.length
    })

    // Calculate global averages
    const globalCriteriaMap = new Map<string, number[]>()
    allConversations.forEach((conv) => {
      conv.all_criteria_details?.forEach((criteria) => {
        if (!globalCriteriaMap.has(criteria.criteria_name)) {
          globalCriteriaMap.set(criteria.criteria_name, [])
        }
        globalCriteriaMap.get(criteria.criteria_name)!.push(criteria.score)
      })
    })

    const globalAvg: Record<string, number> = {}
    globalCriteriaMap.forEach((scores, name) => {
      globalAvg[name] = scores.reduce((a, b) => a + b, 0) / scores.length
    })

    // Build criteria comparison data
      const criteriaComparison = (conversation.all_criteria_details || []).map((criteria) => ({
        name: criteria.criteria_name,
        score: criteria.score,
        personaAvg: personaAvg[criteria.criteria_name] || 0,
        globalAvg: globalAvg[criteria.criteria_name] || 0,
      }))

      return { personaAvg, globalAvg, criteriaComparison }
    } catch (error) {
      console.error("[ConversationEvaluation] Error processing data:", error)
      return { personaAvg: {}, globalAvg: {}, criteriaComparison: [] }
    }
  }, [conversation, allConversations])

  const sortedCriteria = useMemo(() => {
    const sorted = [...criteriaComparison]
    sorted.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else {
        return sortOrder === "asc" ? a.score - b.score : b.score - a.score
      }
    })
    return sorted
  }, [criteriaComparison, sortBy, sortOrder])

  const radarData = useMemo(() => {
    return criteriaComparison.map((c) => ({
      criteria: c.name,
      "This Conv": c.score,
      "Persona Avg": c.personaAvg,
      "Global Avg": c.globalAvg,
    }))
  }, [criteriaComparison])

  const toggleSort = (column: "name" | "score") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const toggleRow = (criteriaName: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(criteriaName)) {
      newExpanded.delete(criteriaName)
    } else {
      newExpanded.add(criteriaName)
    }
    setExpandedRows(newExpanded)
  }

  const outcome = conversation.conversations_summary?.[0]?.outcome || "unknown"
  const avgScore = conversation.avg_score

  return (
    <div className="space-y-6 bg-gradient-to-br from-background via-background to-muted/10 p-6">
      <Card className={`border-2 shadow-lg ${getScoreBgGradient(avgScore)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Overall Score</p>
              <div className={`text-7xl font-black ${getScoreColor(avgScore)}`}>{avgScore.toFixed(1)}</div>
              <p className="text-muted-foreground text-sm mt-1">out of 10.0</p>
            </div>
            <div className="space-y-3 text-right">
              <div>
                <Badge
                  variant={outcome === "success" ? "default" : outcome === "partial" ? "secondary" : "destructive"}
                  className="text-lg px-4 py-2 uppercase font-bold shadow-sm"
                >
                  {outcome}
                </Badge>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-muted-foreground text-sm uppercase font-medium">Turns:</span>
                <span className="text-2xl font-bold text-chart-1">{conversation.avg_turns}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-xl font-black uppercase text-foreground">Criteria Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-muted/30">
                <TableHead className="text-muted-foreground uppercase text-xs font-bold">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("name")} className="hover:text-primary">
                    Criterio
                    {sortBy === "name" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-1 h-3 w-3" />
                      ))}
                  </Button>
                </TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("score")} className="hover:text-primary">
                    Score
                    {sortBy === "score" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-1 h-3 w-3" />
                      ))}
                  </Button>
                </TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">
                  vs Persona
                </TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">
                  vs Global
                </TableHead>
                <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCriteria.map((criteria) => {
                const diffPersona = criteria.score - criteria.personaAvg
                const diffGlobal = criteria.score - criteria.globalAvg
                const isExpanded = expandedRows.has(criteria.name)

                return (
                  <>
                    <TableRow key={criteria.name} className="border-border hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold text-foreground">{criteria.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <div className={`text-2xl font-bold ${getScoreColor(criteria.score)}`}>
                            {criteria.score.toFixed(1)}
                          </div>
                          <Progress
                            value={criteria.score * 10}
                            className={`h-2 bg-muted ${getProgressColor(criteria.score)}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {diffPersona > 0.5 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : diffPersona < -0.5 ? (
                            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              diffPersona > 0
                                ? "text-green-600 dark:text-green-400 font-semibold"
                                : diffPersona < 0
                                  ? "text-red-600 dark:text-red-400 font-semibold"
                                  : "text-muted-foreground"
                            }
                          >
                            {diffPersona > 0 ? "+" : ""}
                            {diffPersona.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {diffGlobal > 0.5 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : diffGlobal < -0.5 ? (
                            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              diffGlobal > 0
                                ? "text-green-600 dark:text-green-400 font-semibold"
                                : diffGlobal < 0
                                  ? "text-red-600 dark:text-red-400 font-semibold"
                                  : "text-muted-foreground"
                            }
                          >
                            {diffGlobal > 0 ? "+" : ""}
                            {diffGlobal.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={criteria.score >= 8 ? "default" : criteria.score >= 6 ? "secondary" : "destructive"}
                          className="uppercase font-bold shadow-sm"
                        >
                          {criteria.score >= 8 ? "Excellent" : criteria.score >= 6 ? "Good" : "Poor"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(criteria.name)}
                          className="hover:text-primary"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-border bg-gradient-to-r from-muted/20 to-muted/10">
                        <TableCell colSpan={6} className="p-4">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">Persona Average:</span>{" "}
                              {criteria.personaAvg.toFixed(1)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">Global Average:</span>{" "}
                              {criteria.globalAvg.toFixed(1)}
                            </p>
                            {conversation.conversations_summary?.[0]?.human_notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-semibold text-foreground">Notes:</span>{" "}
                                {conversation.conversations_summary[0].human_notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-2 border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black uppercase text-foreground">Performance Comparison</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={chartView === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView("all")}
                className="uppercase text-xs font-bold"
              >
                All
              </Button>
              <Button
                variant={chartView === "persona" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView("persona")}
                className="uppercase text-xs font-bold"
              >
                vs Persona
              </Button>
              <Button
                variant={chartView === "global" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView("global")}
                className="uppercase text-xs font-bold"
              >
                vs Global
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-gradient-to-br from-background/50 to-muted/10">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="criteria" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              {(chartView === "all" || chartView === "persona") && (
                <Radar
                  name="This Conv"
                  dataKey="This Conv"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.6}
                />
              )}
              {chartView === "all" && (
                <>
                  <Radar
                    name="Persona Avg"
                    dataKey="Persona Avg"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Global Avg"
                    dataKey="Global Avg"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                  />
                </>
              )}
              {chartView === "persona" && (
                <Radar
                  name="Persona Avg"
                  dataKey="Persona Avg"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.4}
                />
              )}
              {chartView === "global" && (
                <Radar
                  name="Global Avg"
                  dataKey="Global Avg"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.4}
                />
              )}
              <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
