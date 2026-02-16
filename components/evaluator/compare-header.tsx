import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react"

interface CompareHeaderProps {
  evaluationA: {
    evaluator_name: string
    evaluator_version: string
    overall_score: number
    success_rate: number
  }
  evaluationB: {
    evaluator_name: string
    evaluator_version: string
    overall_score: number
    success_rate: number
  }
  deltas: {
    overall_score: { value: number; percent: number }
    success_rate: { value: number; percent: number }
  }
  verdict: {
    better_evaluation: "a" | "b" | "tie"
    improvements: number
    regressions: number
    unchanged: number
  }
}

export function CompareHeader({
  evaluationA,
  evaluationB,
  deltas,
  verdict,
}: CompareHeaderProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {evaluationA.evaluator_name} v{evaluationA.evaluator_version}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <div className="text-2xl font-bold">
              {evaluationA.overall_score.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-lg font-semibold">
              {(evaluationA.success_rate * 100).toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {verdict.better_evaluation === "a" && (
              <>
                <Trophy className="h-4 w-4 text-yellow-500" />
                Evaluation A Wins
              </>
            )}
            {verdict.better_evaluation === "b" && (
              <>
                <Trophy className="h-4 w-4 text-yellow-500" />
                Evaluation B Wins
              </>
            )}
            {verdict.better_evaluation === "tie" && "Tie"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Score Delta</div>
            <div className="text-xl font-bold">
              {getDeltaBadge(deltas.overall_score.value)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Success Rate Delta
            </div>
            <div className="text-lg font-semibold">
              {getDeltaBadge(deltas.success_rate.value, true)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {verdict.improvements} improvements • {verdict.regressions} regressions •{" "}
            {verdict.unchanged} unchanged
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {evaluationB.evaluator_name} v{evaluationB.evaluator_version}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <div className="text-2xl font-bold">
              {evaluationB.overall_score.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-lg font-semibold">
              {(evaluationB.success_rate * 100).toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
