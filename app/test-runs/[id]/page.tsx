"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Hash,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  Zap,
} from "lucide-react"
import { EvaluationsList } from "@/components/evaluations-list"

interface TestRunDetail {
  id: string
  test_run_code: string
  prompt_version_id: string
  prompt_name: string
  prompt_version: string
  mode: string
  status: string
  current_iteration: number
  max_iterations: number
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  tool_scenario_id: string | null
  started_at: string
  completed_at: string | null
  battle_results: Array<{
    id: string
    persona_name: string
    outcome: string
    score: number | null
  }>
}

const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  completed: { variant: "default", icon: CheckCircle2 },
  running: { variant: "secondary", icon: Loader2 },
  pending: { variant: "outline", icon: Clock },
  failed: { variant: "destructive", icon: AlertCircle },
  aborted: { variant: "destructive", icon: AlertCircle },
  awaiting_review: { variant: "secondary", icon: Clock },
}

export default function TestRunDetailPage() {
  const params = useParams<{ id: string }>()
  const [testRun, setTestRun] = useState<TestRunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTestRun() {
      try {
        setLoading(true)
        const res = await fetch(`/api/test-runs/${params.id}`)
        const result = await res.json()

        if (!res.ok || !result.success) {
          setError(result.error?.message || "Failed to load test run")
          return
        }

        setTestRun(result.data)
      } catch (err) {
        console.error("[TestRunDetail] Error:", err)
        setError(err instanceof Error ? err.message : "Failed to load test run")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchTestRun()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-64" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  if (error || !testRun) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Link href="/test-launcher">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Test Launcher
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error || "Test run not found"}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[testRun.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const totalBattles = testRun.success_count + testRun.failure_count + testRun.timeout_count

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Back navigation */}
      <div className="flex items-center gap-4">
        <Link href="/test-launcher">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Test Launcher
          </Button>
        </Link>
      </div>

      {/* Test Run Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                {testRun.test_run_code}
              </CardTitle>
              <CardDescription>
                {testRun.prompt_name} — {testRun.prompt_version}
              </CardDescription>
            </div>
            <Badge variant={statusCfg.variant} className="gap-1">
              <StatusIcon className={`h-3 w-3 ${testRun.status === "running" ? "animate-spin" : ""}`} />
              {testRun.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />Score
              </p>
              <p className="text-2xl font-bold">
                {testRun.overall_score !== null ? testRun.overall_score.toFixed(1) : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />Battles
              </p>
              <p className="text-lg font-semibold">
                <span className="text-green-500">{testRun.success_count}</span>
                {" / "}
                <span className="text-red-500">{testRun.failure_count}</span>
                {" / "}
                <span className="text-muted-foreground">{testRun.timeout_count}</span>
              </p>
              <p className="text-xs text-muted-foreground">{totalBattles} total</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />Started
              </p>
              <p className="text-sm font-medium">
                {new Date(testRun.started_at).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm font-medium">
                {testRun.completed_at
                  ? new Date(testRun.completed_at).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mode / Scenario</p>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-xs">
                  {testRun.mode}
                </Badge>
                {testRun.tool_scenario_id && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    {testRun.tool_scenario_id}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Section */}
      <EvaluationsList testRunId={testRun.id} />
    </div>
  )
}
