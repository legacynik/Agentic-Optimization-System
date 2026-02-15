"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Trophy,
} from "lucide-react"

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
  const [expandedPersonas, setExpandedPersonas] = useState<Set<string>>(new Set())

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

  function togglePersona(personaId: string) {
    setExpandedPersonas((prev) => {
      const next = new Set(prev)
      if (next.has(personaId)) {
        next.delete(personaId)
      } else {
        next.add(personaId)
      }
      return next
    })
  }

  function getDeltaBadge(delta: number, isPercentage = false) {
    const formatted = isPercentage
      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`
      : delta > 0
      ? `+${delta.toFixed(2)}`
      : delta.toFixed(2)

    if (Math.abs(delta) < 0.01) {
      return (
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" />
          {formatted}
        </Badge>
      )
    }

    if (delta > 0) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <ArrowUp className="h-3 w-3" />
          {formatted}
        </Badge>
      )
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <ArrowDown className="h-3 w-3" />
        {formatted}
      </Badge>
    )
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Evaluation A */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {data.evaluation_a.evaluator_name} v
                    {data.evaluation_a.evaluator_version}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                    <div className="text-2xl font-bold">
                      {data.evaluation_a.overall_score.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                    <div className="text-lg font-semibold">
                      {(data.evaluation_a.success_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delta */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {data.verdict.better_evaluation === "a" && (
                      <>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Evaluation A Wins
                      </>
                    )}
                    {data.verdict.better_evaluation === "b" && (
                      <>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Evaluation B Wins
                      </>
                    )}
                    {data.verdict.better_evaluation === "tie" && "Tie"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Score Delta</div>
                    <div className="text-xl font-bold">
                      {getDeltaBadge(data.deltas.overall_score.value)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Success Rate Delta
                    </div>
                    <div className="text-lg font-semibold">
                      {getDeltaBadge(data.deltas.success_rate.value, true)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {data.verdict.improvements} improvements •{" "}
                    {data.verdict.regressions} regressions •{" "}
                    {data.verdict.unchanged} unchanged
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation B */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {data.evaluation_b.evaluator_name} v
                    {data.evaluation_b.evaluator_version}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                    <div className="text-2xl font-bold">
                      {data.evaluation_b.overall_score.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                    <div className="text-lg font-semibold">
                      {(data.evaluation_b.success_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Criteria Tab */}
          <TabsContent value="criteria">
            <Card>
              <CardHeader>
                <CardTitle>Criteria Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead className="text-center">Evaluation A</TableHead>
                      <TableHead className="text-center">Delta</TableHead>
                      <TableHead className="text-center">Evaluation B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.deltas.criteria.map((criterion) => (
                      <TableRow key={criterion.name}>
                        <TableCell className="font-medium">
                          {criterion.name.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{criterion.a.toFixed(2)}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getDeltaBadge(criterion.delta)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{criterion.b.toFixed(2)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Per Persona Tab */}
          <TabsContent value="personas" className="space-y-2">
            {data.per_persona.map((persona) => (
              <Card key={persona.persona_id}>
                <Collapsible
                  open={expandedPersonas.has(persona.persona_id)}
                  onOpenChange={() => togglePersona(persona.persona_id)}
                >
                  <CardHeader className="cursor-pointer">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {persona.persona_name}
                        </CardTitle>
                        {getDeltaBadge(persona.delta)}
                      </div>
                      {expandedPersonas.has(persona.persona_id) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Criterion</TableHead>
                            <TableHead className="text-center">Eval A</TableHead>
                            <TableHead className="text-center">Delta</TableHead>
                            <TableHead className="text-center">Eval B</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {persona.criteria_deltas.map((criterion) => (
                            <TableRow key={criterion.name}>
                              <TableCell className="text-sm">
                                {criterion.name.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {criterion.a.toFixed(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {getDeltaBadge(criterion.delta)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {criterion.b.toFixed(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
