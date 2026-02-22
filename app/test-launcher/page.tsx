/**
 * Test Launcher Page
 *
 * Allows users to launch AI persona battle tests via n8n workflows.
 * Fetches prompt versions from Supabase and displays test history.
 *
 * @module app/test-launcher/page
 */
"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Play,
  Rocket,
  Users,
  Zap,
  Info,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { TestRunStatusMonitor } from "@/components/test-run-status-monitor"
import { useTestRuns, TestRunStatus } from "@/hooks/use-test-run-status"
import { getScenarioOptions, ToolScenarioId, TOOL_SCENARIOS } from "@/lib/tool-scenarios"

/**
 * PromptVersion interface - matches prompt_versions table in Supabase
 * FIX BUG-004: Replaced mock data with real DB schema
 */
interface PromptVersion {
  id: string          // UUID from prompt_versions table
  prompt_name: string // e.g., "Medical Audit Assistant"
  version: string     // e.g., "v3.0"
  status: "production" | "testing" | "draft"
  personas_count?: number   // Count from prompt_personas junction
  last_score?: number | null
  last_run_at?: string | null
}

export default function TestLauncherPage() {
  // FIX BUG-004: Fetch real prompt versions from Supabase instead of mock data
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)

  /**
   * Fetches prompt versions from Supabase with associated persona counts
   * Runs on mount to populate the prompt selector
   */
  useEffect(() => {
    async function fetchPromptVersions() {
      console.log("[TestLauncher] Fetching prompt versions...")
      const supabase = getSupabase()

      try {
        // Fetch prompt versions
        const { data: versions, error } = await supabase
          .from("prompt_versions")
          .select("id, prompt_name, version, status, created_at")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[TestLauncher] Error fetching prompt_versions:", error)
          return
        }

        if (!versions || versions.length === 0) {
          console.log("[TestLauncher] No prompt versions found")
          setPrompts([])
          return
        }

        // Fetch persona counts for each prompt via prompt_personas junction
        const { data: personaCounts, error: countError } = await supabase
          .from("prompt_personas")
          .select("prompt_name")
          .eq("is_active", true)

        const countMap: Record<string, number> = {}
        if (!countError && personaCounts) {
          personaCounts.forEach((row: { prompt_name: string }) => {
            countMap[row.prompt_name] = (countMap[row.prompt_name] || 0) + 1
          })
        }

        // Map to interface format
        const mappedPrompts: PromptVersion[] = versions.map((v: {
          id: string
          prompt_name: string
          version: string
          status: string | null
        }) => ({
          id: v.id,
          prompt_name: v.prompt_name,
          version: v.version,
          status: (v.status || "draft") as "production" | "testing" | "draft",
          personas_count: countMap[v.prompt_name] || 0,
          last_score: null,    // Could be fetched from test_runs if needed
          last_run_at: null    // Could be fetched from test_runs if needed
        }))

        console.log("[TestLauncher] Loaded", mappedPrompts.length, "prompt versions")
        setPrompts(mappedPrompts)
      } catch (err) {
        console.error("[TestLauncher] Unexpected error:", err)
      } finally {
        setPromptsLoading(false)
      }
    }

    fetchPromptVersions()
  }, [])

  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  const [testMode, setTestMode] = useState<"single" | "full_cycle_with_review">("full_cycle_with_review")
  // Per PRD 10.2: Tool scenario dropdown
  const [toolScenario, setToolScenario] = useState<ToolScenarioId>("happy_path")
  const [loading, setLoading] = useState(false)
  const [activeTestRunId, setActiveTestRunId] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)

  // Fetch test runs history
  const { data: testRuns, isLoading: isLoadingRuns } = useTestRuns({ limit: 20 })

  // Tool scenario options
  const scenarioOptions = getScenarioOptions()

  /**
   * Launches a new test run by calling POST /api/test-runs
   * FIX BUG-005: Payload uses 'mode' not 'test_mode', and personas are fetched server-side
   */
  async function handleLaunchTest() {
    if (!selectedPrompt) return

    setLoading(true)
    setLaunchError(null) // Clear any previous errors
    console.log("[TestLauncher] Launching test for prompt:", selectedPrompt)

    try {
      // FIX BUG-005: Use 'mode' instead of 'test_mode'
      // Personas are fetched server-side via prompt_personas table - don't send count
      const payload = {
        prompt_version_id: selectedPrompt,
        mode: testMode,                    // FIX: was 'test_mode'
        tool_scenario_id: toolScenario,
        // Note: personas are resolved server-side from prompt_personas junction table
      }

      console.log("[TestLauncher] POST /api/test-runs payload:", payload)

      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        console.error("[TestLauncher] API error:", json)
        throw new Error(json.error?.message || json.error || "Failed to launch test")
      }

      const data = json.data ?? json
      console.log("[TestLauncher] Test run created:", data)
      setActiveTestRunId(data.test_run_id || data.id || data.test_run_code)
    } catch (error) {
      console.error("[TestLauncher] Failed to launch test:", error)
      setLaunchError(error instanceof Error ? error.message : "Failed to launch test")
    } finally {
      setLoading(false)
    }
  }

  function handleViewResults(testRunId: string) {
    window.location.href = `/test-runs/${testRunId}`
  }

  const selectedPromptData = prompts.find((p) => p.id === selectedPrompt)
  const selectedScenario = TOOL_SCENARIOS[toolScenario]

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Test Launcher</h1>
            <p className="text-sm text-muted-foreground">
              Execute automated tests using n8n workflows
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-2">
            <Zap className="h-3 w-3 text-green-500" />
            n8n Connected
          </Badge>
        </div>

        <Tabs defaultValue="launch" className="space-y-4">
          <TabsList>
            <TabsTrigger value="launch" className="gap-2">
              <Rocket className="h-4 w-4" />
              Launch Test
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="launch" className="space-y-4">
            {/* Launch Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
                <CardDescription>
                  Select a prompt version and configure the test run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Prompt Version Selector - FIX BUG-004: Shows real data from Supabase */}
                  <div className="space-y-2">
                    <Label>Prompt Version</Label>
                    <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                      <SelectTrigger>
                        <SelectValue placeholder={promptsLoading ? "Loading..." : "Select a prompt version"} />
                      </SelectTrigger>
                      <SelectContent>
                        {promptsLoading ? (
                          <SelectItem value="__loading__" disabled>Loading prompt versions...</SelectItem>
                        ) : prompts.length === 0 ? (
                          <SelectItem value="__empty__" disabled>No prompt versions found</SelectItem>
                        ) : (
                          prompts.map((prompt) => (
                            <SelectItem key={prompt.id} value={prompt.id}>
                              <div className="flex items-center gap-2">
                                <span>{prompt.prompt_name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {prompt.version}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tool Scenario Selector - Per PRD 10.2 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Tool Scenario</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Controls how mocked tools respond during the test. Select different scenarios to test edge cases.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={toolScenario}
                      onValueChange={(v) => setToolScenario(v as ToolScenarioId)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scenarioOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Test Mode Selector */}
                  <div className="space-y-2">
                    <Label>Test Mode</Label>
                    <Select
                      value={testMode}
                      onValueChange={(v: "single" | "full_cycle_with_review") => setTestMode(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">
                          Single Run - Execute once
                        </SelectItem>
                        <SelectItem value="full_cycle_with_review">
                          Full Cycle - With human review
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Scenario Details */}
                {selectedScenario && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">{selectedScenario.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedScenario.detailedDescription || selectedScenario.description}
                        </p>
                        {selectedScenario.tags && (
                          <div className="flex gap-1 mt-2">
                            {selectedScenario.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Prompt Summary - FIX BUG-004: Uses new field names */}
                {selectedPromptData && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Personas</p>
                        <p className="text-lg font-semibold">{selectedPromptData.personas_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Score</p>
                        <p className="text-lg font-semibold">
                          {selectedPromptData.last_score || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge
                          variant={selectedPromptData.status === "production" ? "default" : "secondary"}
                        >
                          {selectedPromptData.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Run</p>
                        <p className="text-sm">
                          {selectedPromptData.last_run_at
                            ? new Date(selectedPromptData.last_run_at).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Error Alert */}
                  {launchError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{launchError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Launch Button */}
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={handleLaunchTest}
                      disabled={!selectedPrompt || loading || !!activeTestRunId}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Launch Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Test Run Monitor - Per PRD 10.3 */}
            {activeTestRunId && (
              <TestRunStatusMonitor
                testRunId={activeTestRunId}
                onViewResults={handleViewResults}
              />
            )}

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Automated testing workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  {[
                    { step: 1, title: "Launch", desc: "Click to trigger n8n webhook" },
                    { step: 2, title: "Fetch", desc: "n8n loads personas from DB" },
                    { step: 3, title: "Execute", desc: "AI battles run automatically" },
                    { step: 4, title: "Evaluate", desc: "Results scored by evaluator" },
                    { step: 5, title: "Review", desc: "View results in dashboard" },
                  ].map((item) => (
                    <div key={item.step} className="text-center space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {item.step}
                      </div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Run History</CardTitle>
                <CardDescription>Previous test executions and results</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRuns ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Scenario</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!testRuns || testRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No test runs yet. Launch a test to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        testRuns.map((run) => (
                          <TableRow
                            key={run.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewResults(run.id)}
                          >
                            <TableCell className="font-mono text-xs">{run.test_run_code}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {run.tool_scenario_id || "happy_path"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={run.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={run.progress} className="w-16 h-1.5" />
                                <span className="text-xs text-muted-foreground">
                                  {run.progress}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {run.avg_score !== null ? (
                                <span className="font-medium">{run.avg_score.toFixed(1)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(run.started_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Eye className="h-3 w-3" />
                                Details
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Prompt Versions Table - FIX BUG-004: Uses real data from Supabase */}
            <Card>
              <CardHeader>
                <CardTitle>Available Prompts</CardTitle>
                <CardDescription>All prompt versions available for testing</CardDescription>
              </CardHeader>
              <CardContent>
                {promptsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Personas</TableHead>
                        <TableHead>Last Score</TableHead>
                        <TableHead>Last Run</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No prompt versions found. Create a prompt version to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        prompts.map((prompt) => (
                          <TableRow key={prompt.id}>
                            <TableCell className="font-medium">{prompt.prompt_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{prompt.version}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={prompt.status === "production" ? "default" : "secondary"}
                              >
                                {prompt.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {prompt.personas_count || 0}
                              </div>
                            </TableCell>
                            <TableCell>
                              {prompt.last_score ? (
                                <span className="font-medium">{prompt.last_score}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {prompt.last_run_at
                                ? new Date(prompt.last_run_at).toLocaleDateString()
                                : "Never"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

// Helper component for status badges
function StatusBadge({ status }: { status: TestRunStatus }) {
  const config: Record<TestRunStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: {
      variant: "outline",
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    running: {
      variant: "secondary",
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    },
    completed: {
      variant: "default",
      icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
    },
    failed: {
      variant: "destructive",
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
    },
    aborted: {
      variant: "destructive",
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
    },
    awaiting_review: {
      variant: "secondary",
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
  }

  const { variant, icon } = config[status] || config.pending

  return (
    <Badge variant={variant}>
      {icon}
      {status}
    </Badge>
  )
}
