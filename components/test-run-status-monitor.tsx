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
import { toast } from "sonner"
import { useTestRunStatus, useAbortTestRun, TestRunStatus } from "@/hooks/use-test-run-status"
import { PromptDiffViewer } from "@/components/prompt-diff-viewer"

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
  const { data: testRun, isLoading, error, refetch } = useTestRunStatus(testRunId)
  const abortMutation = useAbortTestRun()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  // TODO: Implement full edit mode with inline prompt editor (Phase 8)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)
  void isEditing // Suppress unused warning until edit UI is implemented

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

  /**
   * Handle approval of proposed prompt changes
   * Calls POST /api/test-runs/[id]/continue to resume the test cycle
   */
  const handleApprove = async () => {
    if (!testRunId) return
    setIsApproving(true)

    try {
      const res = await fetch(`/api/test-runs/${testRunId}/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          edited_prompt: editedPrompt, // Include edited prompt if user modified it
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to continue test run")
      }

      toast.success("Prompt approved! Test cycle continuing...")
      setEditedPrompt(null)
      setIsEditing(false)
      refetch() // Refresh status
    } catch (err) {
      console.error("[TestRunStatusMonitor] Approve error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to approve changes")
    } finally {
      setIsApproving(false)
    }
  }

  /**
   * Handle rejection of proposed prompt changes
   */
  const handleReject = async () => {
    if (!testRunId) return

    try {
      const res = await fetch(`/api/test-runs/${testRunId}/abort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "user_rejected_prompt",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reject changes")
      }

      toast.info("Prompt changes rejected. Test cycle stopped.")
      refetch()
    } catch (err) {
      console.error("[TestRunStatusMonitor] Reject error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to reject changes")
    }
  }

  /**
   * Handle edit before approve - opens editing mode
   */
  const handleEdit = () => {
    setIsEditing(true)
    // In a real implementation, we would load the proposed prompt into an editor
    toast.info("Edit mode enabled - modify the prompt and then approve")
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

        {/* Awaiting Review - Show Diff Viewer (PRD 10.6) */}
        {testRun.status === "awaiting_review" && (
          <div className="pt-4">
            <PromptDiffViewer
              oldVersion={getMockOldPrompt()}
              newVersion={getMockNewPrompt()}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
              isApproving={isApproving}
              title={`Iteration ${testRun.current_iteration} - Proposed Prompt Optimization`}
              oldVersionLabel={`Current (Iteration ${testRun.current_iteration - 1 || 1})`}
              newVersionLabel={`Proposed (Iteration ${testRun.current_iteration})`}
            />
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

/**
 * Mock prompt data for demonstration
 * TODO: Replace with real API data - fetch current and proposed prompts
 * from test_runs table or related optimization_history table
 */
function getMockOldPrompt(): string {
  return `You are a medical appointment assistant. Help patients book appointments.

## Instructions
1. Greet the patient warmly
2. Ask what type of appointment they need
3. Check available times
4. Confirm the booking

## Rules
- Be polite and professional
- Never share other patient information
- Escalate complex medical questions to a human`
}

function getMockNewPrompt(): string {
  return `You are a medical appointment assistant. Help patients book appointments efficiently.

## Instructions
1. Greet the patient warmly and ask their name
2. Ask what type of appointment they need
3. Confirm their preferred date and time range
4. Check available times using the calendar tool
5. Present top 3 available options
6. Confirm the booking with appointment details

## Rules
- Be polite, professional, and empathetic
- Never share other patient information
- Escalate complex medical questions to a human
- Always confirm the patient's contact information

## Optimizations Applied
- Added name collection for personalization
- Added preference gathering before calendar check
- Limited options to reduce decision fatigue`
}
