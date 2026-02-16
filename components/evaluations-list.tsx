"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Star, StarOff, BarChart3, Loader2, RefreshCw } from "lucide-react"
import { ReEvaluateModal } from "@/components/re-evaluate-modal"
import { EvaluationCompareView } from "@/components/evaluation-compare-view"

interface Evaluation {
  id: string
  evaluator_name: string
  evaluator_version: string
  evaluator_config_id: string
  status: "pending" | "running" | "completed" | "failed"
  is_promoted: boolean
  overall_score: number | null
  success_count: number
  failure_count: number
  partial_count: number
  battles_evaluated: number
  created_at: string
  completed_at: string | null
}

interface EvaluationsListProps {
  testRunId: string
  onPromote?: (evaluationId: string) => void
}

export function EvaluationsList({ testRunId, onPromote }: EvaluationsListProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReEvaluate, setShowReEvaluate] = useState(false)
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])

  useEffect(() => {
    fetchEvaluations()
  }, [testRunId])

  async function fetchEvaluations() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/evaluations?test_run_id=${testRunId}`)
      const result = await response.json()

      if (result.error) {
        console.error("Error fetching evaluations:", result.error)
        setError(result.error)
        return
      }

      setEvaluations(result.data || [])
    } catch (error) {
      console.error("Failed to fetch evaluations:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch evaluations")
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(evaluationId: string) {
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}/promote`, {
        method: "POST",
      })
      const result = await response.json()

      if (result.error) {
        console.error("Error promoting evaluation:", result.error)
        return
      }

      // Refresh evaluations
      fetchEvaluations()
      onPromote?.(evaluationId)
    } catch (error) {
      console.error("Failed to promote evaluation:", error)
    }
  }

  function handleCompareToggle(evaluationId: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(evaluationId)) {
        return prev.filter((id) => id !== evaluationId)
      }
      if (prev.length >= 2) {
        // Replace oldest selection
        return [prev[1], evaluationId]
      }
      return [...prev, evaluationId]
    })
  }

  function handleCompare() {
    if (selectedForCompare.length === 2) {
      setCompareIds([selectedForCompare[0], selectedForCompare[1]])
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      running: "default",
      completed: "default",
      failed: "destructive",
    }
    const icons: Record<string, React.ReactNode> = {
      pending: <Loader2 className="mr-1 h-3 w-3" />,
      running: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
      completed: null,
      failed: null,
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {icons[status]}
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Evaluations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={fetchEvaluations} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Evaluations
                <Badge variant="outline">{evaluations.length}</Badge>
              </CardTitle>
              <CardDescription>
                Multiple evaluations for this test run
                {selectedForCompare.length > 0 &&
                  ` • ${selectedForCompare.length} selected for comparison`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedForCompare.length === 2 && (
                <Button variant="outline" onClick={handleCompare}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Compare Selected
                </Button>
              )}
              <Button onClick={() => setShowReEvaluate(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-evaluate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No evaluations found. Click "Re-evaluate" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Compare</TableHead>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Failure</TableHead>
                  <TableHead>Partial</TableHead>
                  <TableHead>Battles</TableHead>
                  <TableHead>Promoted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow
                    key={evaluation.id}
                    className={
                      selectedForCompare.includes(evaluation.id)
                        ? "bg-muted/50"
                        : ""
                    }
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(evaluation.id)}
                        onChange={() => handleCompareToggle(evaluation.id)}
                        disabled={
                          evaluation.status !== "completed" ||
                          (!selectedForCompare.includes(evaluation.id) &&
                            selectedForCompare.length >= 2)
                        }
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {evaluation.evaluator_name}
                    </TableCell>
                    <TableCell>{evaluation.evaluator_version}</TableCell>
                    <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                    <TableCell>
                      {evaluation.overall_score !== null ? (
                        <Badge variant="outline">
                          {evaluation.overall_score.toFixed(2)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">
                        {evaluation.success_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {evaluation.failure_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {evaluation.partial_count}
                      </Badge>
                    </TableCell>
                    <TableCell>{evaluation.battles_evaluated}</TableCell>
                    <TableCell>
                      {evaluation.is_promoted ? (
                        <Badge variant="default">
                          <Star className="mr-1 h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!evaluation.is_promoted &&
                        evaluation.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromote(evaluation.id)}
                            title="Promote as default"
                          >
                            <StarOff className="h-4 w-4" />
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReEvaluateModal
        testRunId={testRunId}
        open={showReEvaluate}
        onOpenChange={setShowReEvaluate}
        onSuccess={fetchEvaluations}
      />

      {compareIds && (
        <EvaluationCompareView
          evaluationId1={compareIds[0]}
          evaluationId2={compareIds[1]}
          onClose={() => {
            setCompareIds(null)
            setSelectedForCompare([])
          }}
        />
      )}
    </>
  )
}
