"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  TestTube,
  Webhook,
  Zap,
  Settings2,
  Database,
} from "lucide-react"

interface WorkflowConfig {
  id: string
  workflow_type: string
  webhook_url: string
  is_active: boolean
  description: string
  last_tested_at: string | null
  test_status: "success" | "failed" | "never_tested" | null
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<WorkflowConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  // Default configs if none exist
  const defaultConfigs: Partial<WorkflowConfig>[] = [
    {
      workflow_type: "test_runner",
      webhook_url: "",
      is_active: false,
      description: "Main test runner workflow that executes persona battles",
    },
    {
      workflow_type: "evaluator",
      webhook_url: "",
      is_active: false,
      description: "Evaluates conversation results and scores them",
    },
    {
      workflow_type: "persona_generator",
      webhook_url: "",
      is_active: false,
      description: "Generates new test personas using AI",
    },
  ]

  useEffect(() => {
    fetchConfigs()
  }, [])

  /**
   * Fetches workflow configurations from /api/settings
   * Merges API response with default configs to ensure all workflow types are shown
   * FIX BUG-003: API returns {data: [...]} wrapper, must access data.data
   */
  async function fetchConfigs() {
    try {
      console.log("[Settings] Fetching workflow configs...")
      const res = await fetch("/api/settings")
      if (res.ok) {
        const responseJson = await res.json()
        // FIX BUG-003: API returns {data: [...]} wrapper
        const configsArray = responseJson.data || responseJson
        console.log("[Settings] Loaded configs:", configsArray.length)

        // Merge with defaults to show all workflow types
        const merged = defaultConfigs.map((defaultConfig) => {
          const existing = configsArray.find((c: WorkflowConfig) => c.workflow_type === defaultConfig.workflow_type)
          return existing || { ...defaultConfig, id: "", last_tested_at: null, test_status: "never_tested" }
        })
        setConfigs(merged as WorkflowConfig[])
      } else {
        console.error("[Settings] API returned error:", res.status)
      }
    } catch (error) {
      console.error("[Settings] Failed to fetch configs:", error)
      setConfigs(defaultConfigs.map((c) => ({ ...c, id: "", last_tested_at: null, test_status: "never_tested" }) as WorkflowConfig))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(config: WorkflowConfig) {
    setSaving(true)
    try {
      const method = config.id ? "PATCH" : "POST"
      const res = await fetch("/api/settings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (res.ok) {
        const updated = await res.json()
        setConfigs((prev) =>
          prev.map((c) => (c.workflow_type === config.workflow_type ? updated : c))
        )
      }
    } catch (error) {
      console.error("Failed to save config:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(workflowType: string) {
    setTesting(workflowType)
    try {
      const res = await fetch(`/api/settings/${workflowType}/test`, { method: "POST" })
      const result = await res.json()

      setConfigs((prev) =>
        prev.map((c) =>
          c.workflow_type === workflowType
            ? { ...c, test_status: result.success ? "success" : "failed", last_tested_at: new Date().toISOString() }
            : c
        )
      )
    } catch (error) {
      console.error("Failed to test webhook:", error)
      setConfigs((prev) =>
        prev.map((c) =>
          c.workflow_type === workflowType
            ? { ...c, test_status: "failed", last_tested_at: new Date().toISOString() }
            : c
        )
      )
    } finally {
      setTesting(null)
    }
  }

  function updateConfig(workflowType: string, updates: Partial<WorkflowConfig>) {
    setConfigs((prev) =>
      prev.map((c) => (c.workflow_type === workflowType ? { ...c, ...updates } : c))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure n8n workflows and integrations
        </p>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows" className="gap-2">
            <Webhook className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Workflow Status Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            {configs.map((config) => (
              <Card key={config.workflow_type} className={config.is_active ? "border-green-500/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium capitalize">
                      {config.workflow_type.replace(/_/g, " ")}
                    </CardTitle>
                    <Badge
                      variant={
                        config.test_status === "success"
                          ? "default"
                          : config.test_status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {config.test_status === "success" ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : config.test_status === "failed" ? (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      ) : null}
                      {config.test_status || "Not tested"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Workflow Configuration Cards */}
          <div className="space-y-4">
            {configs.map((config) => (
              <Card key={config.workflow_type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">
                        {config.workflow_type.replace(/_/g, " ")}
                      </CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${config.workflow_type}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${config.workflow_type}`}
                        checked={config.is_active}
                        onCheckedChange={(checked) => updateConfig(config.workflow_type, { is_active: checked })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`webhook-${config.workflow_type}`}>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`webhook-${config.workflow_type}`}
                        placeholder="https://your-n8n-instance.com/webhook/..."
                        value={config.webhook_url}
                        onChange={(e) => updateConfig(config.workflow_type, { webhook_url: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleTest(config.workflow_type)}
                        disabled={!config.webhook_url || testing === config.workflow_type}
                      >
                        {testing === config.workflow_type ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {config.last_tested_at && (
                      <p className="text-xs text-muted-foreground">
                        Last tested: {new Date(config.last_tested_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave(config)} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>General configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Enable dark theme</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-refresh Dashboard</Label>
                  <p className="text-xs text-muted-foreground">Automatically refresh data every 30 seconds</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive email alerts for test failures</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
              <CardDescription>Supabase configuration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">dlozxirsmrbriuklgcxq</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>API URL</Label>
                <Input
                  value={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
                  disabled
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Tables</Label>
                <div className="flex flex-wrap gap-2">
                  {["test_runs", "personas", "conversations", "evaluation_criteria", "workflow_configs"].map((table) => (
                    <Badge key={table} variant="outline">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Migrations</CardTitle>
              <CardDescription>Database migration history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">001_initial_schema.sql</span>
                  <Badge variant="outline">Applied</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">002_prd_v2_4_schema.sql</span>
                  <Badge variant="outline">Applied</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
