"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { getConversationSummary, getCriteriaList } from "./helpers"

interface ConversationListPanelProps {
  conversations: PersonaPerformanceRow[]
  selectedConversation: PersonaPerformanceRow | null
  onSelectConversation: (conversation: PersonaPerformanceRow) => void
  selectedConversations: string[]
  onToggleSelection: (conversationId: string) => void
}

export function ConversationListPanel({
  conversations,
  selectedConversation,
  onSelectConversation,
  selectedConversations,
  onToggleSelection,
}: ConversationListPanelProps) {
  const getOutcomeIcon = (outcome: string) => {
    if (outcome === "success") return CheckCircle2
    if (outcome === "partial") return AlertTriangle
    return XCircle
  }

  const getOutcomeColor = (outcome: string) => {
    if (outcome === "success") return "text-accent"
    if (outcome === "partial") return "text-secondary"
    return "text-destructive"
  }

  const getBorderColor = (score: number) => {
    if (score >= 8) return "border-l-accent"
    if (score >= 6) return "border-l-secondary"
    return "border-l-destructive"
  }

  return (
    <div className="overflow-y-auto p-4 space-y-3">
      {conversations.map((conv) => {
        const summary = getConversationSummary(conv)
        const outcome = summary.outcome?.toLowerCase() || "partial"
        const allCriteria = getCriteriaList(conv)
        const crashed = summary.crashed_app || false
        const score = Number.parseFloat(conv.avg_score)
        const turns = Math.round(Number.parseFloat(conv.avg_turns))

        const borderColor = getBorderColor(score)
        const OutcomeIcon = getOutcomeIcon(outcome)
        const outcomeColor = getOutcomeColor(outcome)

        const criticalCriteria = allCriteria
          .filter((c: any) => c.score < 6.5)
          .sort((a: any, b: any) => a.score - b.score)
          .slice(0, 3)

        const isSelected = selectedConversations.includes(String(conv.conversationid))

        return (
          <Card
            key={conv.conversationid}
            className={`transition-all border-l-4 border-2 ${borderColor} ${
              selectedConversation?.conversationid === conv.conversationid
                ? "bg-primary/10 border-primary shadow-lg shadow-primary/20"
                : "bg-card border-border hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
            }`}
          >
            <CardContent className="p-2.5 space-y-2">
              {/* Header: Checkbox + Score + Outcome/Crash */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(String(conv.conversationid))}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select conversation ${conv.conversationid}`}
                  />
                  <Badge
                    variant="secondary"
                    className="font-bold text-xl px-3 py-1 bg-primary text-primary-foreground cursor-pointer"
                    onClick={() => onSelectConversation(conv)}
                  >
                    {score.toFixed(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {crashed && (
                    <Badge variant="destructive" className="text-xs font-bold uppercase tracking-wider">
                      CRASH
                    </Badge>
                  )}
                  <div className={`flex items-center gap-1 ${outcomeColor}`}>
                    <OutcomeIcon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">{outcome}</span>
                  </div>
                </div>
              </div>

              {/* Meta Info Line 1: Category | Persona */}
              <div className="text-sm text-muted-foreground font-mono">
                <span className="font-semibold">{conv.persona_category}</span>
                <span className="mx-1.5 text-primary">|</span>
                <span>{conv.personaid}</span>
              </div>

              {/* Meta Info Line 2: Test Run | Version | Turns */}
              <div className="text-sm text-muted-foreground font-mono">
                <span>...{conv.testrunid?.slice(-6) || "N/A"}</span>
                <span className="mx-1.5 text-primary">|</span>
                <span>{conv.agentversion}</span>
                <span className="mx-1.5 text-primary">|</span>
                <span className="font-bold text-accent">{turns}T</span>
              </div>

              {/* Critical Criteria or All OK */}
              {criticalCriteria.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {criticalCriteria.map((criteria: any) => (
                    <div
                      key={criteria.criteria_name}
                      className="flex items-center gap-2 bg-destructive/20 border border-destructive/50 rounded px-2 py-1"
                    >
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 font-bold">
                        ⚠
                      </Badge>
                      <span className="text-xs text-foreground/90 truncate flex-1 font-mono uppercase">
                        {criteria.criteria_name}
                      </span>
                      <span className="text-sm font-bold text-destructive">{criteria.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-accent border-accent border-2 mt-1 font-bold uppercase"
                >
                  All criteria ✓
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
