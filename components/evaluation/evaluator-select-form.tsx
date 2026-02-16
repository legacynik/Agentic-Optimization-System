"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface EvaluatorConfig {
  id: string
  name: string
  version: string
  description: string | null
  status: "draft" | "active" | "deprecated"
  is_promoted: boolean
  criteria: Array<{ name: string }>
}

interface EvaluatorSelectFormProps {
  configs: EvaluatorConfig[]
  selectedConfigId: string
  onConfigChange: (id: string) => void
  fetchingConfigs: boolean
  loading: boolean
  onSubmit: () => void
  onCancel: () => void
}

export function EvaluatorSelectForm({
  configs,
  selectedConfigId,
  onConfigChange,
  fetchingConfigs,
  loading,
  onSubmit,
  onCancel,
}: EvaluatorSelectFormProps) {
  const selectedConfig = configs.find((c) => c.id === selectedConfigId)

  return (
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
          <Select value={selectedConfigId} onValueChange={onConfigChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Select evaluator config" />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  <div className="flex items-center gap-2">
                    {config.name} v{config.version}
                    {config.is_promoted && (
                      <Badge variant="default" className="ml-2 text-xs">Default</Badge>
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
            <div className="text-muted-foreground">{selectedConfig.description}</div>
          )}
          <div className="text-muted-foreground">{selectedConfig.criteria.length} criteria</div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={onSubmit} disabled={loading || !selectedConfigId}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Re-evaluation
        </Button>
      </div>
    </>
  )
}
