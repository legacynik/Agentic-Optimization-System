"use client"

import { useState } from "react"
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

import { TestRunStatusMonitor } from "@/components/test-run-status-monitor"
import { useTestRuns, TestRunStatus } from "@/hooks/use-test-run-status"
import { getScenarioOptions, ToolScenarioId, TOOL_SCENARIOS } from "@/lib/tool-scenarios"

interface PromptVersion {
  id: string
  name: string
  version: string
  status: "production" | "testing" | "draft"
  personas: number
  lastScore: number | null
  lastRunAt: string | null
}

export default function TestLauncherPage() {
  // Mock prompt versions (to be replaced with real API)
  const [prompts] = useState<PromptVersion[]>([
    {
      id: "prompt-1",
      name: "Medical Audit Assistant",
      version: "v3.0",
      status: "production",
      personas: 12,
      lastScore: 8.5,
      lastRunAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "prompt-2",
      name: "Medical Audit Assistant",
      version: "v3.1-beta",
      status: "testing",
      personas: 12,
      lastScore: null,
      lastRunAt: null,
    },
    {
      id: "prompt-3",
      name: "Customer Service Bot",
      version: "v2.1",
      status: "testing",
      personas: 8,
      lastScore: 7.9,
      lastRunAt: "2024-01-14T15:45:00Z",
    },
  ])

  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  const [testMode, setTestMode] = useState<"single" | "full_cycle_with_review">("full_cycle_with_review")
  // Per PRD 10.2: Tool scenario dropdown
  const [toolScenario, setToolScenario] = useState<ToolScenarioId>("happy_path")
  const [loading, setLoading] = useState(false)
  const [activeTestRunId, setActiveTestRunId] = useState<string | null>(null)

  // Fetch test runs history
  const { data: testRuns, isLoading: isLoadingRuns } = useTestRuns({ limit: 20 })

  // Tool scenario options
  const scenarioOptions = getScenarioOptions()

  async function handleLaunchTest() {
    if (!selectedPrompt) return

    setLoading(true)
    try {
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_version_id: selectedPrompt,
          tool_scenario_id: toolScenario,
          test_mode: testMode,
          // Get personas from the selected prompt
          personas: prompts.find((p) => p.id === selectedPrompt)?.personas || 0,
        }),
      })

      if (!res.ok) throw new Error("Failed to launch test")

      const data = await res.json()
      setActiveTestRunId(data.id || data.test_run_code)
    } catch (error) {
      console.error("Failed to launch test:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleViewResults(testRunId: string) {
    // Navigate to results page or open modal
    window.location.href = `/conversations?test_run_id=${testRunId}`
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
                  {/* Prompt Version Selector */}
                  <div className="space-y-2">
                    <Label>Prompt Version</Label>
                    <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a prompt version" />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            <div className="flex items-center gap-2">
                              <span>{prompt.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {prompt.version}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
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

                {/* Selected Prompt Summary */}
                {selectedPromptData && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Personas</p>
                        <p className="text-lg font-semibold">{selectedPromptData.personas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Score</p>
                        <p className="text-lg font-semibold">
                          {selectedPromptData.lastScore || "—"}
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
                          {selectedPromptData.lastRunAt
                            ? new Date(selectedPromptData.lastRunAt).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!testRuns || testRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No test runs yet. Launch a test to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        testRuns.map((run) => (
                          <TableRow key={run.id}>
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
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Prompt Versions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Available Prompts</CardTitle>
                <CardDescription>All prompt versions available for testing</CardDescription>
              </CardHeader>
              <CardContent>
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
                    {prompts.map((prompt) => (
                      <TableRow key={prompt.id}>
                        <TableCell className="font-medium">{prompt.name}</TableCell>
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
                            {prompt.personas}
                          </div>
                        </TableCell>
                        <TableCell>
                          {prompt.lastScore ? (
                            <span className="font-medium">{prompt.lastScore}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {prompt.lastRunAt
                            ? new Date(prompt.lastRunAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
