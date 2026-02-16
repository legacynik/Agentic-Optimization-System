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
import { Loader2 } from "lucide-react"
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
  }
  evaluation_b: {
    id: string
    evaluator_name: string
    evaluator_version: string
    overall_score: number
    success_rate: number
    criteria_avg: Record<string, number>
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
}

export function EvaluationCompareView({
  evaluationId1,
  evaluationId2,
  onClose,
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
      const response = await fetch(
        `/api/evaluations/${evaluationId1}/compare/${evaluationId2}`
      )
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

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="personas">Per Persona</TabsTrigger>
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
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
