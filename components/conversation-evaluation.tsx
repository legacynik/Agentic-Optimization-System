"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EvaluationScoreCard } from "@/components/evaluation/evaluation-score-card"
import { CriteriaTable } from "@/components/evaluation/criteria-table"
import { PerformanceRadar } from "@/components/evaluation/performance-radar"
import { buildCriteriaComparison } from "@/lib/criteria-comparison"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface ConversationEvaluationProps {
  conversation: PersonaPerformanceRow
  allConversations?: PersonaPerformanceRow[]
  loading?: boolean
  error?: string
}

export function ConversationEvaluation({ conversation, allConversations = [], loading = false, error }: ConversationEvaluationProps) {
  if (loading) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-background via-background to-muted/10 p-6">
        <Skeleton className="h-[200px] w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader><CardTitle>Error Loading Evaluation</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-destructive">{error}</p></CardContent>
      </Card>
    )
  }

  if (!conversation.all_criteria_details || conversation.all_criteria_details.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No evaluation criteria available for this conversation.
        </CardContent>
      </Card>
    )
  }

  const { criteriaComparison } = useMemo(() => {
    try {
      return buildCriteriaComparison(conversation, allConversations)
    } catch (err) {
      console.error("[ConversationEvaluation] Error processing data:", err)
      return { personaAvg: {}, globalAvg: {}, criteriaComparison: [] }
    }
  }, [conversation, allConversations])

  const outcome = conversation.conversations_summary?.[0]?.outcome || "unknown"
  const humanNotes = conversation.conversations_summary?.[0]?.human_notes

  return (
    <div className="space-y-6 bg-gradient-to-br from-background via-background to-muted/10 p-6">
      <EvaluationScoreCard
        avgScore={conversation.avg_score}
        outcome={outcome}
        avgTurns={conversation.avg_turns}
      />
      <CriteriaTable
        criteriaComparison={criteriaComparison}
        humanNotes={humanNotes}
      />
      <PerformanceRadar criteriaComparison={criteriaComparison} />
    </div>
  )
}
