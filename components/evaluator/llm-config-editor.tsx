"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, RefreshCw } from "lucide-react"

export interface LlmRoleConfig {
  model: string
  provider: string
  fallback: string
}

export interface LlmConfig {
  judge: LlmRoleConfig
  analyzer: LlmRoleConfig
}

interface LlmConfigEditorProps {
  config: LlmConfig
  onChange: (config: LlmConfig) => void
}

export function LlmConfigEditor({ config, onChange }: LlmConfigEditorProps) {
  function updateRole(role: "judge" | "analyzer", field: keyof LlmRoleConfig, value: string) {
    onChange({
      ...config,
      [role]: { ...config[role], [field]: value },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">LLM Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure which models the evaluator uses. Changes take effect on the
          next evaluation — no n8n workflow changes needed.
        </p>
      </div>

      <RoleConfig
        role="judge"
        label="Judge Agent"
        description="Scores individual battles against criteria"
        icon={<Bot className="h-4 w-4" />}
        config={config.judge}
        onChange={(field, value) => updateRole("judge", field, value)}
      />

      <RoleConfig
        role="analyzer"
        label="Analyzer"
        description="Generates overall evaluation summary"
        icon={<RefreshCw className="h-4 w-4" />}
        config={config.analyzer}
        onChange={(field, value) => updateRole("analyzer", field, value)}
      />
    </div>
  )
}

function RoleConfig({
  label,
  description,
  icon,
  config,
  onChange,
}: {
  role: string
  label: string
  description: string
  icon: React.ReactNode
  config: LlmRoleConfig
  onChange: (field: keyof LlmRoleConfig, value: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {label}
          <Badge variant="outline" className="text-xs">
            {config.provider}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Model</Label>
            <Input
              value={config.model}
              onChange={(e) => onChange("model", e.target.value)}
              placeholder="gemini-2.5-flash"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Input
              value={config.provider}
              onChange={(e) => onChange("provider", e.target.value)}
              placeholder="google"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fallback Model</Label>
            <Input
              value={config.fallback}
              onChange={(e) => onChange("fallback", e.target.value)}
              placeholder="gemini-2.0-flash"
              className="text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
