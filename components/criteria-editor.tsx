"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Criterion {
  name: string
  weight: number
  description: string
  scoring_guide?: string
}

interface CriteriaEditorProps {
  criteria: Criterion[]
  onChange: (criteria: Criterion[]) => void
}

export function CriteriaEditor({ criteria, onChange }: CriteriaEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  function addCriterion() {
    onChange([
      ...criteria,
      {
        name: "",
        weight: 1.0,
        description: "",
        scoring_guide: "",
      },
    ])
    setExpandedIndex(criteria.length) // Expand the newly added criterion
  }

  function removeCriterion(index: number) {
    onChange(criteria.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }

  function updateCriterion(index: number, field: keyof Criterion, value: string | number) {
    const updated = [...criteria]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  function moveCriterion(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === criteria.length - 1)
    ) {
      return
    }

    const newIndex = direction === "up" ? index - 1 : index + 1
    const updated = [...criteria]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    onChange(updated)

    // Update expanded index to follow the moved item
    if (expandedIndex === index) {
      setExpandedIndex(newIndex)
    } else if (expandedIndex === newIndex) {
      setExpandedIndex(index)
    }
  }

  function toggleExpanded(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Evaluation Criteria</h3>
          <p className="text-sm text-muted-foreground">
            Add and configure criteria for this evaluator
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
          <Plus className="mr-2 h-4 w-4" />
          Add Criterion
        </Button>
      </div>

      {criteria.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No criteria defined yet. Click "Add Criterion" to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {criteria.map((criterion, index) => (
            <Card key={index}>
              <Collapsible
                open={expandedIndex === index}
                onOpenChange={() => toggleExpanded(index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveCriterion(index, "up")
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveCriterion(index, "down")
                        }}
                        disabled={index === criteria.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <CollapsibleTrigger asChild>
                      <div className="flex-1 flex items-center gap-3 cursor-pointer">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {criterion.name || `Criterion ${index + 1}`}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Weight: {criterion.weight} • {criterion.description || "No description"}
                          </CardDescription>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            expandedIndex === index ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCriterion(index)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${index}`}>
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`name-${index}`}
                          value={criterion.name}
                          onChange={(e) => updateCriterion(index, "name", e.target.value)}
                          placeholder="e.g., italiano_autentico"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`weight-${index}`}>Weight</Label>
                        <Input
                          id={`weight-${index}`}
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={criterion.weight}
                          onChange={(e) =>
                            updateCriterion(index, "weight", parseFloat(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id={`description-${index}`}
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, "description", e.target.value)}
                        placeholder="Brief description of what this criterion evaluates"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`scoring_guide-${index}`}>Scoring Guide</Label>
                      <Textarea
                        id={`scoring_guide-${index}`}
                        value={criterion.scoring_guide || ""}
                        onChange={(e) =>
                          updateCriterion(index, "scoring_guide", e.target.value)
                        }
                        placeholder="Optional: Explain how to score this criterion (e.g., 0-3: Poor, 4-6: Average, 7-10: Excellent)"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
