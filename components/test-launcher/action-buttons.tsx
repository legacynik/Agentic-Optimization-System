import { Button } from "@/components/ui/button"
import { Loader2, Square, XCircle, Eye } from "lucide-react"
import type { TestRunStatus } from "@/hooks/use-test-run-status"

interface ActionButtonsProps {
  status: TestRunStatus
  testRunId: string
  isConfirming: boolean
  isAborting: boolean
  onAbort: () => void
  onCancelAbort: () => void
  onViewResults?: (testRunId: string) => void
}

export function ActionButtons({
  status,
  testRunId,
  isConfirming,
  isAborting,
  onAbort,
  onCancelAbort,
  onViewResults,
}: ActionButtonsProps) {
  const canAbort = status === "running" || status === "pending" || status === "battles_completed" || status === "evaluating"
  const canViewResults = status === "completed" || status === "awaiting_review"

  return (
    <div className="flex justify-end gap-2">
      {canAbort && (
        <>
          {isConfirming ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelAbort}
                disabled={isAborting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onAbort}
                disabled={isAborting}
              >
                {isAborting ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-3 w-3" />
                )}
                Confirm Abort
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={onAbort}
            >
              <Square className="mr-2 h-3 w-3" />
              Kill Test
            </Button>
          )}
        </>
      )}

      {canViewResults && onViewResults && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onViewResults(testRunId)}
        >
          <Eye className="mr-2 h-3 w-3" />
          View Results
        </Button>
      )}
    </div>
  )
}
