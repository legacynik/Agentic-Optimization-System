import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SystemPromptEditorProps {
  value: string
  error?: string
  onChange: (value: string) => void
}

export function SystemPromptEditor({
  value,
  error,
  onChange,
}: SystemPromptEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="system_prompt_template">
          System Prompt Template <span className="text-destructive">*</span>
        </Label>
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
    </div>
  )
}
