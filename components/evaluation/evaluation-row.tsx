"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Star, StarOff, Loader2, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  model_used: string | null
  created_at: string
  completed_at: string | null
  error_count: number
  has_analysis: boolean
}

interface EvaluationRowProps {
  evaluation: Evaluation
  isSelected: boolean
  canSelect: boolean
  onCompareToggle: (id: string) => void
  onPromote: (id: string) => void
}

export function EvaluationRow({ evaluation, isSelected, canSelect, onCompareToggle, onPromote }: EvaluationRowProps) {
  return (
    <TableRow className={isSelected ? "bg-muted/50" : ""}>
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onCompareToggle(evaluation.id)}
          disabled={evaluation.status !== "completed" || (!isSelected && !canSelect)}
          className="cursor-pointer"
        />
      </TableCell>
      <TableCell className="font-medium">{evaluation.evaluator_name}</TableCell>
      <TableCell>{evaluation.evaluator_version}</TableCell>
      <TableCell><StatusBadge status={evaluation.status} /></TableCell>
      <TableCell>
        {evaluation.overall_score !== null ? (
          <Badge variant="outline">{evaluation.overall_score.toFixed(2)}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell><Badge variant="default" className="bg-green-600">{evaluation.success_count}</Badge></TableCell>
      <TableCell><Badge variant="destructive">{evaluation.failure_count}</Badge></TableCell>
      <TableCell><Badge variant="secondary">{evaluation.partial_count}</Badge></TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {evaluation.battles_evaluated}
          {evaluation.error_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{evaluation.battles_evaluated - evaluation.error_count}/{evaluation.battles_evaluated} scored, {evaluation.error_count} parse error{evaluation.error_count > 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        {evaluation.model_used ? (
          <Badge variant="outline" className="text-xs font-mono">
            {evaluation.model_used}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      <TableCell>
        {evaluation.is_promoted ? (
          <Badge variant="default"><Star className="mr-1 h-3 w-3 fill-current" />Default</Badge>
        ) : (
          <Badge variant="outline">-</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!evaluation.is_promoted && evaluation.status === "completed" && (
          <Button variant="ghost" size="sm" onClick={() => onPromote(evaluation.id)} title="Promote as default">
            <StarOff className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    running: "default",
    completed: "default",
    failed: "destructive",
  }
  return (
    <Badge variant={variants[status] || "default"}>
      {status === "running" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {status === "pending" && <Loader2 className="mr-1 h-3 w-3" />}
      {status}
    </Badge>
  )
}
