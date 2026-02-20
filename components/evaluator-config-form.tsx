"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CriteriaEditor, CriteriaTaxonomy } from "@/components/criteria-editor"
import { ConfigFormFields } from "@/components/evaluator/config-form-fields"
import { SystemPromptEditor } from "@/components/evaluator/system-prompt-editor"
import { LlmConfigEditor, LlmConfig } from "@/components/evaluator/llm-config-editor"
import { FormActions } from "@/components/evaluator/form-actions"

interface EvaluatorConfig {
  id?: string
  name: string
  version: string
  description: string | null
  prompt_version_id: string
  criteria: CriteriaTaxonomy
  llm_config: LlmConfig | null
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

const DEFAULT_LLM_CONFIG: LlmConfig = {
  judge: { model: "gemini-2.5-flash", provider: "google", fallback: "gemini-2.0-flash" },
  analyzer: { model: "gemini-2.5-flash", provider: "google", fallback: "gemini-2.0-flash" },
}

const DEFAULT_CRITERIA: CriteriaTaxonomy = {
  core: [
    "brevita_risposte",
    "una_domanda_per_turno",
    "mantenimento_flusso",
    "tono_naturale",
    "gestione_chiusura",
    "adattamento_persona",
  ],
  domain: [],
  weights: {},
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
    prompt_version_id: "",
    criteria: DEFAULT_CRITERIA,
    llm_config: DEFAULT_LLM_CONFIG,
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
    fetchPrompts()

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
    if (!formData.prompt_version_id) {
      newErrors.prompt_version_id = "Prompt is required"
    }
    if (formData.criteria.core.length === 0 && formData.criteria.domain.length === 0) {
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

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  // Build flat criteria list for system prompt preview
  const criteriaForPreview = [
    ...formData.criteria.core,
    ...formData.criteria.domain,
  ].map((name) => ({
    name,
    weight: formData.criteria.weights[name] ?? 1.0,
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="llm">LLM Config</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <ConfigFormFields
            formData={formData}
            prompts={prompts}
            errors={errors}
            onChange={handleFieldChange}
          />
        </TabsContent>

        <TabsContent value="criteria" className="space-y-4">
          <CriteriaEditor
            criteria={formData.criteria}
            onChange={(criteria) => setFormData({ ...formData, criteria })}
          />
          {errors.criteria && (
            <p className="text-sm text-destructive">{errors.criteria}</p>
          )}
        </TabsContent>

        <TabsContent value="llm" className="space-y-4">
          <LlmConfigEditor
            config={formData.llm_config || DEFAULT_LLM_CONFIG}
            onChange={(llm_config) => setFormData({ ...formData, llm_config })}
          />
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <SystemPromptEditor
            value={formData.system_prompt_template}
            criteriaNames={criteriaForPreview}
            error={errors.system_prompt_template}
            onChange={(value) =>
              setFormData({ ...formData, system_prompt_template: value })
            }
          />
        </TabsContent>
      </Tabs>

      <FormActions
        isEditing={!!config}
        isLoading={loading}
        error={errors.submit}
        onCancel={onCancel}
      />
    </form>
  )
}
