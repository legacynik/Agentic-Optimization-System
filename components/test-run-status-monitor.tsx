"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTestRunStatus, useAbortTestRun } from "@/hooks/use-test-run-status"
import { PromptDiffViewer } from "@/components/prompt-diff-viewer"
import { StatusDisplay } from "@/components/test-launcher/status-display"
import { ProgressBar } from "@/components/test-launcher/progress-bar"
import { ActionButtons } from "@/components/test-launcher/action-buttons"
import { StatusInfo } from "@/components/test-launcher/status-info"
import { getMockOldPrompt, getMockNewPrompt } from "@/lib/mock-prompts"

interface TestRunStatusMonitorProps {
  testRunId: string | null
  onViewResults?: (testRunId: string) => void
}

export function TestRunStatusMonitor({
  testRunId,
  onViewResults,
}: TestRunStatusMonitorProps) {
  const { data: testRun, isLoading, error, refetch } = useTestRunStatus(testRunId)
  const abortMutation = useAbortTestRun()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)

  const handleAbort = async () => {
    if (!testRunId) return

    if (!isConfirming) {
      setIsConfirming(true)
      return
    }

    await abortMutation.mutateAsync(testRunId)
    setIsConfirming(false)
  }

  const handleCancelAbort = () => {
    setIsConfirming(false)
  }

  const handleApprove = async () => {
    if (!testRunId) return
    setIsApproving(true)

    try {
      const res = await fetch(`/api/test-runs/${testRunId}/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          edited_prompt: editedPrompt,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to continue test run")
      }

      toast.success("Prompt approved! Test cycle continuing...")
      setEditedPrompt(null)
      refetch()
    } catch (err) {
      console.error("[TestRunStatusMonitor] Approve error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to approve changes")
    } finally {
      setIsApproving(false)
    }
  }

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

  const handleEdit = () => {
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

  const statusConfig = getStatusBorderClass(testRun.status)

  return (
    <Card className={statusConfig}>
      <CardHeader className="pb-2">
        <StatusDisplay status={testRun.status} testRunCode={testRun.test_run_code} />
      </CardHeader>

      <CardContent className="space-y-4">
        <ProgressBar
          status={testRun.status}
          completedPersonas={testRun.completed_personas}
          totalPersonas={testRun.total_personas}
          progress={testRun.progress}
        />

        <StatusInfo
          status={testRun.status}
          avgScore={testRun.avg_score}
          totalPersonas={testRun.total_personas}
          errorMessage={testRun.error_message}
        />

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

        <ActionButtons
          status={testRun.status}
          testRunId={testRunId}
          isConfirming={isConfirming}
          isAborting={abortMutation.isPending}
          onAbort={handleAbort}
          onCancelAbort={handleCancelAbort}
          onViewResults={onViewResults}
        />
      </CardContent>
    </Card>
  )
}

function getStatusBorderClass(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "border-muted",
    running: "border-blue-500/50",
    battles_completed: "border-cyan-500/50",
    evaluating: "border-purple-500/50",
    completed: "border-green-500/50",
    failed: "border-destructive/50",
    aborted: "border-orange-500/50",
    awaiting_review: "border-yellow-500/50",
  }
  return statusMap[status] || ""
}
