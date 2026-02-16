import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Prompt {
  id: string
  name: string
}

interface ConfigFormFieldsProps {
  formData: {
    name: string
    version: string
    description: string | null
    prompt_version_id: string
    status: "draft" | "active" | "deprecated"
    success_config: {
      min_score: number
      min_success_rate: number
    } | null
  }
  prompts: Prompt[]
  errors: Record<string, string>
  onChange: (field: string, value: any) => void
}

export function ConfigFormFields({
  formData,
  prompts,
  errors,
  onChange,
}: ConfigFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
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
            onChange={(e) => onChange("version", e.target.value)}
            placeholder="e.g., 1.0"
          />
          {errors.version && (
            <p className="text-sm text-destructive">{errors.version}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt_version_id">
          Prompt <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.prompt_version_id}
          onValueChange={(value) => onChange("prompt_version_id", value)}
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
        {errors.prompt_version_id && (
          <p className="text-sm text-destructive">{errors.prompt_version_id}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Brief description of this evaluator configuration"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value: "draft" | "active" | "deprecated") =>
            onChange("status", value)
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
                onChange("success_config", {
                  ...formData.success_config!,
                  min_score: parseFloat(e.target.value),
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
                onChange("success_config", {
                  ...formData.success_config!,
                  min_success_rate: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
