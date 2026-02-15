"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

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

export function ReEvaluateModal({
  testRunId,
  open,
  onOpenChange,
  onSuccess,
}: ReEvaluateModalProps) {
  const [configs, setConfigs] = useState<EvaluatorConfig[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [fetchingConfigs, setFetchingConfigs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<"idle" | "submitting" | "polling" | "complete">(
    "idle"
  )

  useEffect(() => {
    if (open) {
      fetchConfigs()
    }
  }, [open])

  async function fetchConfigs() {
    try {
      setFetchingConfigs(true)
      const response = await fetch("/api/evaluator-configs")
      const result = await response.json()

      if (result.error) {
        setError("Failed to load evaluator configs")
        return
      }

      // Filter to only active configs
      const activeConfigs = (result.data || []).filter(
        (c: EvaluatorConfig) => c.status === "active"
      )
      setConfigs(activeConfigs)

      // Pre-select promoted config if available
      const promoted = activeConfigs.find((c: EvaluatorConfig) => c.is_promoted)
      if (promoted) {
        setSelectedConfigId(promoted.id)
      }
    } catch (err) {
      console.error("Failed to fetch configs:", err)
      setError("Failed to load evaluator configs")
    } finally {
      setFetchingConfigs(false)
    }
  }

  async function handleSubmit() {
    if (!selectedConfigId) {
      setError("Please select an evaluator config")
      return
    }

    setError(null)
    setLoading(true)
    setStatus("submitting")

    try {
      const response = await fetch("/api/evaluations/re-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_run_id: testRunId,
          evaluator_config_id: selectedConfigId,
        }),
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error.message || "Failed to create re-evaluation")
        setStatus("idle")
        return
      }

      // Start polling for completion
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
    const maxAttempts = 60 // 5 minutes max (5s intervals)
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++
      setProgress((attempts / maxAttempts) * 100)

      try {
        const response = await fetch(`/api/evaluations?test_run_id=${testRunId}`)
        const result = await response.json()

        if (result.error) {
          clearInterval(interval)
          setError("Failed to check evaluation status")
          setStatus("idle")
          return
        }

        const evaluation = result.data?.find(
          (e: { id: string }) => e.id === evaluationId
        )

        if (!evaluation) {
          clearInterval(interval)
          setError("Evaluation not found")
          setStatus("idle")
          return
        }

        if (evaluation.status === "completed") {
          clearInterval(interval)
          setStatus("complete")
          setProgress(100)
          setTimeout(() => {
            onSuccess()
            onOpenChange(false)
            resetState()
          }, 1500)
        } else if (evaluation.status === "failed") {
          clearInterval(interval)
          setError("Evaluation failed")
          setStatus("idle")
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          setError("Evaluation timeout - please check evaluations list")
          setStatus("idle")
        }
      } catch (err) {
        console.error("Polling error:", err)
        clearInterval(interval)
        setError("Failed to check evaluation status")
        setStatus("idle")
      }
    }, 5000) // Poll every 5 seconds
  }

  function resetState() {
    setSelectedConfigId("")
    setError(null)
    setProgress(0)
    setStatus("idle")
  }

  function handleClose() {
    if (status === "polling") {
      if (
        !confirm(
          "Evaluation is in progress. Closing this will not cancel it. Continue?"
        )
      ) {
        return
      }
    }
    onOpenChange(false)
    resetState()
  }

  const selectedConfig = configs.find((c) => c.id === selectedConfigId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Re-evaluate Test Run</DialogTitle>
          <DialogDescription>
            Select an evaluator configuration to re-evaluate this test run with
            different criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "complete" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Re-evaluation completed successfully!
              </AlertDescription>
            </Alert>
          )}

          {status === "polling" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Evaluating...</span>
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                This may take a few minutes. You can close this modal and check the
                evaluations list later.
              </p>
            </div>
          )}

          {status !== "complete" && status !== "polling" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="evaluator_config">
                  Evaluator Configuration <span className="text-destructive">*</span>
                </Label>
                {fetchingConfigs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading configs...
                  </div>
                ) : (
                  <Select
                    value={selectedConfigId}
                    onValueChange={setSelectedConfigId}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select evaluator config" />
                    </SelectTrigger>
                    <SelectContent>
                      {configs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center gap-2">
                            {config.name} v{config.version}
                            {config.is_promoted && (
                              <Badge variant="default" className="ml-2 text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedConfig && (
                <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                  <div className="font-medium">{selectedConfig.name}</div>
                  {selectedConfig.description && (
                    <div className="text-muted-foreground">
                      {selectedConfig.description}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    {selectedConfig.criteria.length} criteria
                  </div>
                </div>
              )}
            </>
          )}

          {status !== "complete" && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                {status === "polling" ? "Close" : "Cancel"}
              </Button>
              {status !== "polling" && (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedConfigId}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Re-evaluation
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
