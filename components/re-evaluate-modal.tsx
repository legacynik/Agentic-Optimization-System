"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { EvaluatorSelectForm } from "@/components/evaluation/evaluator-select-form"
import { EvaluationProgress } from "@/components/evaluation/evaluation-progress"

interface EvaluatorConfig {
  id: string
  name: string
  version: string
  description: string | null
  status: "draft" | "active" | "deprecated"
  is_promoted: boolean
  criteria: Array<{ name: string }>
}

interface ReEvaluateModalProps {
  testRunId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ReEvaluateModal({ testRunId, open, onOpenChange, onSuccess }: ReEvaluateModalProps) {
  const [configs, setConfigs] = useState<EvaluatorConfig[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingConfigs, setFetchingConfigs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "submitting" | "polling" | "complete">("idle")

  useEffect(() => {
    if (open) fetchConfigs()
  }, [open])

  async function fetchConfigs() {
    try {
      setFetchingConfigs(true)
      const response = await fetch("/api/evaluator-configs")
      const result = await response.json()
      if (result.error) { setError("Failed to load evaluator configs"); return }

      const activeConfigs = (result.data || []).filter((c: EvaluatorConfig) => c.status === "active")
      setConfigs(activeConfigs)

      const promoted = activeConfigs.find((c: EvaluatorConfig) => c.is_promoted)
      if (promoted) setSelectedConfigId(promoted.id)
    } catch (err) {
      console.error("Failed to fetch configs:", err)
      setError("Failed to load evaluator configs")
    } finally {
      setFetchingConfigs(false)
    }
  }

  async function handleSubmit() {
    if (!selectedConfigId) { setError("Please select an evaluator config"); return }

    setError(null)
    setLoading(true)
    setStatus("submitting")

    try {
      const response = await fetch("/api/evaluations/re-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_run_id: testRunId, evaluator_config_id: selectedConfigId }),
      })
      const result = await response.json()

      if (result.error) { setError(result.error.message || "Failed to create re-evaluation"); setStatus("idle"); return }
      setStatus("polling")
      pollEvaluationStatus(result.data.id)
    } catch (err) {
      console.error("Failed to submit re-evaluation:", err)
      setError("Failed to create re-evaluation")
      setStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  async function pollEvaluationStatus(evaluationId: string) {
    const maxAttempts = 60
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++
      setProgress((attempts / maxAttempts) * 100)

      try {
        const response = await fetch(`/api/evaluations?test_run_id=${testRunId}`)
        const result = await response.json()

        if (result.error) { clearInterval(interval); setError("Failed to check evaluation status"); setStatus("idle"); return }

        const evaluation = result.data?.find((e: { id: string }) => e.id === evaluationId)
        if (!evaluation) { clearInterval(interval); setError("Evaluation not found"); setStatus("idle"); return }

        if (evaluation.status === "completed") {
          clearInterval(interval)
          setStatus("complete")
          setProgress(100)
          setTimeout(() => { onSuccess(); onOpenChange(false); resetState() }, 1500)
        } else if (evaluation.status === "failed") {
          clearInterval(interval); setError("Evaluation failed"); setStatus("idle")
        } else if (attempts >= maxAttempts) {
          clearInterval(interval); setError("Evaluation timeout - please check evaluations list"); setStatus("idle")
        }
      } catch (err) {
        console.error("Polling error:", err)
        clearInterval(interval); setError("Failed to check evaluation status"); setStatus("idle")
      }
    }, 5000)
  }

  function resetState() {
    setSelectedConfigId(""); setError(null); setProgress(0); setStatus("idle")
  }

  function handleClose() {
    if (status === "polling" && !confirm("Evaluation is in progress. Closing this will not cancel it. Continue?")) return
    onOpenChange(false)
    resetState()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Re-evaluate Test Run</DialogTitle>
          <DialogDescription>
            Select an evaluator configuration to re-evaluate this test run with different criteria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {(status === "polling" || status === "complete") ? (
            <EvaluationProgress status={status} progress={progress} onClose={handleClose} />
          ) : (
            <EvaluatorSelectForm
              configs={configs}
              selectedConfigId={selectedConfigId}
              onConfigChange={setSelectedConfigId}
              fetchingConfigs={fetchingConfigs}
              loading={loading}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
