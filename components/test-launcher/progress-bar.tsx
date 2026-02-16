import { Progress } from "@/components/ui/progress"
import type { TestRunStatus } from "@/hooks/use-test-run-status"

interface ProgressBarProps {
  status: TestRunStatus
  completedPersonas: number
  totalPersonas: number
  progress: number | null
}

export function ProgressBar({
  status,
  completedPersonas,
  totalPersonas,
  progress,
}: ProgressBarProps) {
  const isProcessing = status === "running" || status === "battles_completed" || status === "evaluating"

  if (!isProcessing) return null

  const calculatedProgress = totalPersonas > 0
    ? Math.round((completedPersonas / totalPersonas) * 100)
    : progress || 0

  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {status === "running" || status === "pending" ? (
            <>{completedPersonas} of {totalPersonas} personas completed</>
          ) : status === "battles_completed" ? (
            <>Battles complete. Starting evaluation...</>
          ) : status === "evaluating" ? (
            <>Evaluating results and generating analysis...</>
          ) : null}
        </span>
        <span className="font-medium">
          {status === "running" || status === "pending"
            ? `${calculatedProgress}%`
            : status === "battles_completed"
              ? "100%"
              : "Analyzing..."}
        </span>
      </div>
      <Progress
        value={status === "running" || status === "pending" ? calculatedProgress : 100}
        className={`h-2 ${status === "evaluating" ? "animate-pulse" : ""}`}
      />
    </>
  )
}
