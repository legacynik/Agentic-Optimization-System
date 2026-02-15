"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CriteriaEditor } from "@/components/criteria-editor"
import { Plus, Save, X } from "lucide-react"

interface EvaluatorConfig {
  id?: string
  name: string
  version: string
  description: string | null
  prompt_id: string
  criteria: Array<{
    name: string
    weight: number
    description: string
    scoring_guide?: string
  }>
  system_prompt_template: string
  success_config: {
    min_score: number
    min_success_rate: number
  } | null
  status: "draft" | "active" | "deprecated"
}

interface EvaluatorConfigFormProps {
  config: EvaluatorConfig | null
  onSuccess: () => void
  onCancel: () => void
}

interface Prompt {
  id: string
  name: string
}

export function EvaluatorConfigForm({
  config,
  onSuccess,
  onCancel,
}: EvaluatorConfigFormProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [formData, setFormData] = useState<EvaluatorConfig>({
    name: "",
    version: "1.0",
    description: null,
    prompt_id: "",
    criteria: [],
    system_prompt_template: "",
    success_config: {
      min_score: 8.0,
      min_success_rate: 0.8,
    },
    status: "draft",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Fetch available prompts
    fetchPrompts()

    // Populate form if editing
    if (config) {
      setFormData(config)
    }
  }, [config])

  async function fetchPrompts() {
    try {
      const response = await fetch("/api/prompts/names")
      const result = await response.json()

      if (result.data) {
        setPrompts(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }
    if (!formData.version.trim()) {
      newErrors.version = "Version is required"
    }
    if (!formData.prompt_id) {
      newErrors.prompt_id = "Prompt is required"
    }
    if (formData.criteria.length === 0) {
      newErrors.criteria = "At least one criterion is required"
    }
    if (!formData.system_prompt_template.trim()) {
      newErrors.system_prompt_template = "System prompt template is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const url = config
        ? `/api/evaluator-configs/${config.id}`
        : "/api/evaluator-configs"
      const method = config ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.error) {
        console.error("Error saving config:", result.error)
        setErrors({ submit: result.error.message || "Failed to save config" })
        return
      }

      onSuccess()
    } catch (error) {
      console.error("Failed to save config:", error)
      setErrors({ submit: "Failed to save config" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., sales-evaluator"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">
                Version <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="e.g., 1.0"
              />
              {errors.version && (
                <p className="text-sm text-destructive">{errors.version}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt_id">
              Prompt <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.prompt_id}
              onValueChange={(value) =>
                setFormData({ ...formData, prompt_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a prompt" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.prompt_id && (
              <p className="text-sm text-destructive">{errors.prompt_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this evaluator configuration"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "draft" | "active" | "deprecated") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Success Configuration</CardTitle>
              <CardDescription>
                Define thresholds for success classification
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_score">Minimum Score</Label>
                <Input
                  id="min_score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.success_config?.min_score || 8.0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      success_config: {
                        ...formData.success_config!,
                        min_score: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_success_rate">Minimum Success Rate</Label>
                <Input
                  id="min_success_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.success_config?.min_success_rate || 0.8}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      success_config: {
                        ...formData.success_config!,
                        min_success_rate: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Criteria Tab */}
        <TabsContent value="criteria" className="space-y-4">
          <CriteriaEditor
            criteria={formData.criteria}
            onChange={(criteria) => setFormData({ ...formData, criteria })}
          />
          {errors.criteria && (
            <p className="text-sm text-destructive">{errors.criteria}</p>
          )}
        </TabsContent>

        {/* System Prompt Tab */}
        <TabsContent value="prompt" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system_prompt_template">
              System Prompt Template <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="system_prompt_template"
              value={formData.system_prompt_template}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  system_prompt_template: e.target.value,
                })
              }
              placeholder="Enter system prompt template. Use {{CRITERIA_SECTION}} and {{SCORES_TEMPLATE}} as placeholders."
              rows={15}
              className="font-mono text-sm"
            />
            {errors.system_prompt_template && (
              <p className="text-sm text-destructive">
                {errors.system_prompt_template}
              </p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Placeholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <code className="bg-muted px-2 py-1 rounded">
                  {"{"}
                  {"{"}CRITERIA_SECTION{"}}"}
                  {"}"}
                </code>
                <span className="ml-2 text-muted-foreground">
                  Will be replaced with formatted criteria list
                </span>
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded">
                  {"{"}
                  {"{"}SCORES_TEMPLATE{"}}"}
                  {"}"}
                </code>
                <span className="ml-2 text-muted-foreground">
                  Will be replaced with JSON template for expected scores
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        {errors.submit && (
          <p className="text-sm text-destructive">{errors.submit}</p>
        )}
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : config ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  )
}
