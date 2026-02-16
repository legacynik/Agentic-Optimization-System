"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMemo } from "react"

interface PersonaTestRunsViewProps {
  personaId: string
  personaName: string
  data: Array<{
    testrunid: string
    test_date: string
    avg_score: number
    avg_turns: number
    evaluation_criteria?: Array<{
      criteria_name: string
      score: number
    }>
  }>
  loading?: boolean
  error?: string
}

function getScoreColor(score: number | undefined): string {
  if (!score) return "bg-muted/30"
  if (score >= 8) return "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]"
  if (score >= 6) return "bg-yellow-400 text-black font-medium"
  if (score >= 4) return "bg-orange-500 text-white"
  return "bg-red-500 text-white"
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateString
  }
}

export function PersonaTestRunsView({ personaId, personaName, data, loading = false, error }: PersonaTestRunsViewProps) {
  console.log("[v0] PersonaTestRunsView rendering with data:", { personaId, personaName, dataLength: data.length })

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-[300px]" />
          <Skeleton className="h-4 w-[200px] mt-2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Test Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const { uniqueCriteria, matrix } = useMemo(() => {
    try {
      // Extract all unique criteria names
      const criteriaSet = new Set<string>()
      data.forEach((row) => {
        row.evaluation_criteria?.forEach((ec) => {
          criteriaSet.add(ec.criteria_name)
        })
      })
      const uniqueCriteria = Array.from(criteriaSet).sort()

      // Build matrix: testrun × criteria with scores
      const matrix = data.map((row) => {
        const criteriaScores: Record<string, number | undefined> = {}

        row.evaluation_criteria?.forEach((ec) => {
          criteriaScores[ec.criteria_name] = ec.score
        })

        return {
          testrunid: row.testrunid,
          test_date: row.test_date,
          avg_score: row.avg_score,
          avg_turns: row.avg_turns,
          criteriaScores,
        }
      })

      // Sort by date (most recent first)
      matrix.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())

      return { uniqueCriteria, matrix }
    } catch (processingError) {
      console.error("[PersonaTestRunsView] Error processing data:", processingError)
      return { uniqueCriteria: [], matrix: [] }
    }
  }, [data])

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No test run data available for this persona
        </CardContent>
      </Card>
    )
  }

  if (uniqueCriteria.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No evaluation criteria found for this persona
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Performance History: {personaName}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Showing {matrix.length} test run{matrix.length !== 1 ? "s" : ""} for {personaId}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Test Run</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[80px] text-center">Score</TableHead>
              <TableHead className="w-[80px] text-center">Turns</TableHead>
              {uniqueCriteria.map((criterion) => (
                <TableHead key={criterion} className="text-center min-w-[100px]">
                  {criterion}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.testrunid}>
                <TableCell className="font-mono text-xs">{row.testrunid.slice(0, 20)}...</TableCell>
                <TableCell className="text-xs">{formatDate(row.test_date)}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getScoreColor(row.avg_score)}`}
                  >
                    {row.avg_score.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs">{row.avg_turns.toFixed(0)}</TableCell>
                {uniqueCriteria.map((criterion) => {
                  const score = row.criteriaScores[criterion]
                  return (
                    <TableCell key={criterion} className="text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getScoreColor(score)}`}>
                        {score !== undefined ? score.toFixed(1) : "-"}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
