"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CompareHeader } from "@/components/evaluator/compare-header"
import { CriteriaCompareTable } from "@/components/evaluator/criteria-compare-table"
import { PersonaCompareList } from "@/components/evaluator/persona-compare-list"

interface ComparisonData {
  evaluation_a: {
    id: string
    evaluator_name: string
    evaluator_version: string
    overall_score: number
    success_rate: number
    criteria_avg: Record<string, number>
    model_used?: string | null
    tokens_used?: number | null
  }
  evaluation_b: {
    id: string
    evaluator_name: string
    evaluator_version: string
    overall_score: number
    success_rate: number
    criteria_avg: Record<string, number>
    model_used?: string | null
    tokens_used?: number | null
  }
  prompt_version_warning?: {
    differs: boolean
    version_a: string | null
    version_b: string | null
  } | null
  model_comparison?: {
    eval_a: { model_used: string | null; tokens_used: number | null }
    eval_b: { model_used: string | null; tokens_used: number | null }
    same_model: boolean
  }
  deltas: {
    overall_score: { value: number; percent: number }
    success_rate: { value: number; percent: number }
    criteria: Array<{
      name: string
      a: number
      b: number
      delta: number
      direction: "up" | "down" | "same"
    }>
  }
  criteria_snapshot_diff?: {
    same_config: boolean
    added_criteria: string[]
    removed_criteria: string[]
    weight_changes: Array<{ name: string; a: number; b: number }>
  } | null
  per_persona: Array<{
    persona_id: string
    persona_name: string
    score_a: number
    score_b: number
    delta: number
    criteria_deltas: Array<{
      name: string
      a: number
      b: number
      delta: number
    }>
  }>
  verdict: {
    better_evaluation: "a" | "b" | "tie"
    improvements: number
    regressions: number
    unchanged: number
  }
}

interface EvaluationCompareViewProps {
  evaluationId1: string
  evaluationId2: string
  onClose: () => void
  /** When true, uses the cross-compare endpoint (allows different test runs) */
  crossCompare?: boolean
}

export function EvaluationCompareView({
  evaluationId1,
  evaluationId2,
  onClose,
  crossCompare = false,
}: EvaluationCompareViewProps) {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComparison()
  }, [evaluationId1, evaluationId2])

  async function fetchComparison() {
    try {
      setLoading(true)
      const url = crossCompare
        ? `/api/evaluations/cross-compare?eval_a=${evaluationId1}&eval_b=${evaluationId2}`
        : `/api/evaluations/${evaluationId1}/compare/${evaluationId2}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.error) {
        setError(result.error.message || "Failed to load comparison")
        return
      }

      setData(result.data)
    } catch (err) {
      console.error("Failed to fetch comparison:", err)
      setError("Failed to load comparison")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !data) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 text-destructive">{error || "No data"}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation Comparison</DialogTitle>
        </DialogHeader>

        {data.prompt_version_warning?.differs && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <span>
              <strong>Warning:</strong> These evaluations are from test runs with different prompt
              versions (A: {data.prompt_version_warning.version_a ?? "N/A"}, B:{" "}
              {data.prompt_version_warning.version_b ?? "N/A"}). Score differences may reflect
              prompt changes, not evaluator differences.
            </span>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="personas">Per Persona</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <CompareHeader
              evaluationA={data.evaluation_a}
              evaluationB={data.evaluation_b}
              deltas={data.deltas}
              verdict={data.verdict}
            />
          </TabsContent>

          <TabsContent value="criteria">
            <CriteriaCompareTable criteria={data.deltas.criteria} />
          </TabsContent>

          <TabsContent value="personas" className="space-y-2">
            <PersonaCompareList personas={data.per_persona} />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            {data.model_comparison && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Model:</span>
                  <Badge variant={data.model_comparison.same_model ? "outline" : "secondary"}>
                    {data.model_comparison.same_model ? "Same Model" : "Different Models"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Evaluation A</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Model:</span> {data.model_comparison.eval_a.model_used ?? "N/A"}</p>
                      <p><span className="text-muted-foreground">Tokens:</span> {data.model_comparison.eval_a.tokens_used?.toLocaleString() ?? "N/A"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Evaluation B</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Model:</span> {data.model_comparison.eval_b.model_used ?? "N/A"}</p>
                      <p><span className="text-muted-foreground">Tokens:</span> {data.model_comparison.eval_b.tokens_used?.toLocaleString() ?? "N/A"}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {data.criteria_snapshot_diff && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Criteria Snapshot Diff
                    <Badge variant={data.criteria_snapshot_diff.same_config ? "outline" : "secondary"}>
                      {data.criteria_snapshot_diff.same_config ? "Identical" : "Changed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {data.criteria_snapshot_diff.added_criteria.length > 0 && (
                    <div>
                      <p className="font-medium text-green-600 mb-1">Added Criteria</p>
                      <div className="flex flex-wrap gap-1">
                        {data.criteria_snapshot_diff.added_criteria.map((c) => (
                          <Badge key={c} variant="outline" className="text-green-600 border-green-600">+ {c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.criteria_snapshot_diff.removed_criteria.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600 mb-1">Removed Criteria</p>
                      <div className="flex flex-wrap gap-1">
                        {data.criteria_snapshot_diff.removed_criteria.map((c) => (
                          <Badge key={c} variant="outline" className="text-red-600 border-red-600">- {c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.criteria_snapshot_diff.weight_changes.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Weight Changes</p>
                      <div className="space-y-1">
                        {data.criteria_snapshot_diff.weight_changes.map((w) => (
                          <div key={w.name} className="flex items-center gap-2">
                            <span className="text-muted-foreground">{w.name}:</span>
                            <span>{w.a.toFixed(2)}</span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span>{w.b.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.criteria_snapshot_diff.same_config && (
                    <p className="text-muted-foreground">Both evaluations used identical criteria configuration.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!data.model_comparison && !data.criteria_snapshot_diff && (
              <p className="text-sm text-muted-foreground text-center py-4">No config comparison data available.</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
