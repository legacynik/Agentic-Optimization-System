"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, RefreshCw } from "lucide-react"
import { ReEvaluateModal } from "@/components/re-evaluate-modal"
import { EvaluationCompareView } from "@/components/evaluation-compare-view"
import { EvaluationRow } from "@/components/evaluation/evaluation-row"

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

  useEffect(() => { fetchEvaluations() }, [testRunId])

  async function fetchEvaluations() {
    try {
      setLoading(true); setError(null)
      const response = await fetch(`/api/evaluations?test_run_id=${testRunId}`)
      const result = await response.json()
      if (result.error) { console.error("Error fetching evaluations:", result.error); setError(result.error); return }
      setEvaluations(result.data || [])
    } catch (err) {
      console.error("Failed to fetch evaluations:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch evaluations")
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(evaluationId: string) {
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}/promote`, { method: "POST" })
      const result = await response.json()
      if (result.error) { console.error("Error promoting evaluation:", result.error); return }
      fetchEvaluations()
      onPromote?.(evaluationId)
    } catch (err) {
      console.error("Failed to promote evaluation:", err)
    }
  }

  function handleCompareToggle(evaluationId: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(evaluationId)) return prev.filter((id) => id !== evaluationId)
      if (prev.length >= 2) return [prev[1], evaluationId]
      return [...prev, evaluationId]
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader><CardTitle>Error Loading Evaluations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={fetchEvaluations} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />Retry
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
                Evaluations <Badge variant="outline">{evaluations.length}</Badge>
              </CardTitle>
              <CardDescription>
                Multiple evaluations for this test run
                {selectedForCompare.length > 0 && ` • ${selectedForCompare.length} selected for comparison`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedForCompare.length === 2 && (
                <Button variant="outline" onClick={() => setCompareIds([selectedForCompare[0], selectedForCompare[1]])}>
                  <BarChart3 className="mr-2 h-4 w-4" />Compare Selected
                </Button>
              )}
              <Button onClick={() => setShowReEvaluate(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />Re-evaluate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No evaluations found. Click &quot;Re-evaluate&quot; to create one.
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
                  <EvaluationRow
                    key={evaluation.id}
                    evaluation={evaluation}
                    isSelected={selectedForCompare.includes(evaluation.id)}
                    canSelect={selectedForCompare.length < 2}
                    onCompareToggle={handleCompareToggle}
                    onPromote={handlePromote}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReEvaluateModal testRunId={testRunId} open={showReEvaluate} onOpenChange={setShowReEvaluate} onSuccess={fetchEvaluations} />

      {compareIds && (
        <EvaluationCompareView
          evaluationId1={compareIds[0]}
          evaluationId2={compareIds[1]}
          onClose={() => { setCompareIds(null); setSelectedForCompare([]) }}
        />
      )}
    </>
  )
}
