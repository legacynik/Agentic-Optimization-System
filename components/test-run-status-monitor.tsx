"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Square,
  XCircle,
  Eye,
} from "lucide-react"
import { useTestRunStatus, useAbortTestRun, TestRunStatus } from "@/hooks/use-test-run-status"

interface TestRunStatusMonitorProps {
  testRunId: string | null
  onViewResults?: (testRunId: string) => void
}

/**
 * Test Run Status Monitor
 * Per PRD 10.3: Displays status with progress bar and kill switch
 * States: pending, running, completed, failed, ABORTED, awaiting_review
 */
export function TestRunStatusMonitor({
  testRunId,
  onViewResults,
}: TestRunStatusMonitorProps) {
  const { data: testRun, isLoading, error } = useTestRunStatus(testRunId)
  const abortMutation = useAbortTestRun()
  const [isConfirming, setIsConfirming] = useState(false)

  // Per PRD 9.1: Kill Switch with confirmation
  const handleAbort = async () => {
    if (!testRunId) return

    if (!isConfirming) {
      setIsConfirming(true)
      return
    }

    // User confirmed - execute abort
    await abortMutation.mutateAsync(testRunId)
    setIsConfirming(false)
  }

  const handleCancelAbort = () => {
    setIsConfirming(false)
  }

  if (!testRunId) return null

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !testRun) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-2 py-4 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load test run status</span>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = getStatusConfig(testRun.status)
  const progress = testRun.total_personas > 0
    ? Math.round((testRun.completed_personas / testRun.total_personas) * 100)
    : testRun.progress || 0

  const canAbort = testRun.status === "running" || testRun.status === "pending"
  const canViewResults = testRun.status === "completed" || testRun.status === "awaiting_review"

  return (
    <Card className={statusConfig.borderClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusConfig.icon}
            <CardTitle className="text-base">
              {testRun.status === "running" ? "Test in Progress" : `Test Run: ${testRun.test_run_code}`}
            </CardTitle>
          </div>
          <Badge variant={statusConfig.variant}>
            {testRun.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress section */}
        {(testRun.status === "running" || testRun.status === "pending") && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {testRun.completed_personas} of {testRun.total_personas} personas completed
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </>
        )}

        {/* Completed stats */}
        {testRun.status === "completed" && testRun.avg_score !== null && (
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Avg Score: </span>
              <span className="font-semibold">{testRun.avg_score.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Personas: </span>
              <span className="font-semibold">{testRun.total_personas}</span>
            </div>
          </div>
        )}

        {/* Error message for failed runs */}
        {testRun.status === "failed" && testRun.error_message && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {testRun.error_message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          {/* Kill Switch - Per PRD 9.1 */}
          {canAbort && (
            <>
              {isConfirming ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAbort}
                    disabled={abortMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleAbort}
                    disabled={abortMutation.isPending}
                  >
                    {abortMutation.isPending ? (
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
                  onClick={handleAbort}
                >
                  <Square className="mr-2 h-3 w-3" />
                  Kill Test
                </Button>
              )}
            </>
          )}

          {/* View Results button */}
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
      </CardContent>
    </Card>
  )
}

/**
 * Get styling configuration based on status
 */
function getStatusConfig(status: TestRunStatus): {
  icon: React.ReactNode
  borderClass: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  switch (status) {
    case "pending":
      return {
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        borderClass: "border-muted",
        variant: "outline",
      }
    case "running":
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        borderClass: "border-blue-500/50",
        variant: "secondary",
      }
    case "completed":
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        borderClass: "border-green-500/50",
        variant: "default",
      }
    case "failed":
      return {
        icon: <XCircle className="h-4 w-4 text-destructive" />,
        borderClass: "border-destructive/50",
        variant: "destructive",
      }
    case "aborted":
      return {
        icon: <Square className="h-4 w-4 text-orange-500" />,
        borderClass: "border-orange-500/50",
        variant: "destructive",
      }
    case "awaiting_review":
      return {
        icon: <Eye className="h-4 w-4 text-yellow-500" />,
        borderClass: "border-yellow-500/50",
        variant: "secondary",
      }
    default:
      return {
        icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
        borderClass: "",
        variant: "outline",
      }
  }
}
