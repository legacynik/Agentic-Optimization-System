"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2 } from "lucide-react"

interface EvaluationProgressProps {
  status: "polling" | "complete"
  progress: number
  onClose: () => void
}

export function EvaluationProgress({ status, progress, onClose }: EvaluationProgressProps) {
  if (status === "complete") {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>Re-evaluation completed successfully!</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Evaluating...</span>
          <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground">
          This may take a few minutes. You can close this modal and check the evaluations list later.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  )
}
