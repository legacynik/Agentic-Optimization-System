"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getScoreTextColor, getScoreBgGradient } from "@/lib/score-utils"

interface EvaluationScoreCardProps {
  avgScore: number
  outcome: string
  avgTurns: number
}

export function EvaluationScoreCard({ avgScore, outcome, avgTurns }: EvaluationScoreCardProps) {
  return (
    <Card className={`border-2 shadow-lg ${getScoreBgGradient(avgScore)}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Overall Score</p>
            <div className={`text-7xl font-black ${getScoreTextColor(avgScore)}`}>{avgScore.toFixed(1)}</div>
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
              <span className="text-2xl font-bold text-chart-1">{avgTurns}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
