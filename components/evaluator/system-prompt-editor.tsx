"use client"

import { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

interface Criterion {
  name: string
  weight: number
  description: string
  scoring_guide?: string
}

interface SystemPromptEditorProps {
  value: string
  criteria: Criterion[]
  error?: string
  onChange: (value: string) => void
}

function buildCriteriaSection(criteria: Criterion[]): string {
  if (criteria.length === 0) return "(no criteria defined)"
  return criteria
    .map(
      (c, i) =>
        `${i + 1}. **${c.name}** (weight: ${c.weight})\n   ${c.description}${c.scoring_guide ? `\n   Scoring guide: ${c.scoring_guide}` : ""}`
    )
    .join("\n")
}

function buildScoresTemplate(criteria: Criterion[]): string {
  if (criteria.length === 0) return "{}"
  const obj: Record<string, number> = {}
  for (const c of criteria) {
    obj[c.name] = 0
  }
  return JSON.stringify(obj, null, 2)
}

export function SystemPromptEditor({
  value,
  criteria,
  error,
  onChange,
}: SystemPromptEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const interpolated = useMemo(() => {
    if (!value) return ""
    return value
      .replace(/\{\{CRITERIA_SECTION\}\}/g, buildCriteriaSection(criteria))
      .replace(/\{\{SCORES_TEMPLATE\}\}/g, buildScoresTemplate(criteria))
  }, [value, criteria])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="system_prompt_template">
            System Prompt Template <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <><EyeOff className="h-4 w-4 mr-1" /> Hide Preview</>
            ) : (
              <><Eye className="h-4 w-4 mr-1" /> Show Preview</>
            )}
          </Button>
        </div>
        <Textarea
          id="system_prompt_template"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter system prompt template. Use {{CRITERIA_SECTION}} and {{SCORES_TEMPLATE}} as placeholders."
          rows={15}
          className="font-mono text-sm"
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interpolated Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
              {interpolated || "(empty template)"}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Placeholders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <code className="bg-muted px-2 py-1 rounded">
              {"{{CRITERIA_SECTION}}"}
            </code>
            <span className="ml-2 text-muted-foreground">
              Will be replaced with formatted criteria list
            </span>
          </div>
          <div>
            <code className="bg-muted px-2 py-1 rounded">
              {"{{SCORES_TEMPLATE}}"}
            </code>
            <span className="ml-2 text-muted-foreground">
              Will be replaced with JSON template for expected scores
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
