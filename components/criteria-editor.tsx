"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Lock, Plus, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Criteria taxonomy format matching the API */
export interface CriteriaTaxonomy {
  core: string[]
  domain: string[]
  weights: Record<string, number>
}

/** Definition from criteria_definitions table */
interface CriteriaDefinition {
  id: string
  name: string
  description: string
  scoring_guide: string | null
  category: "core" | "domain"
  domain_type: string | null
  weight_default: number
}

interface CriteriaEditorProps {
  criteria: CriteriaTaxonomy
  onChange: (criteria: CriteriaTaxonomy) => void
}

export function CriteriaEditor({ criteria, onChange }: CriteriaEditorProps) {
  const [definitions, setDefinitions] = useState<CriteriaDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDefinitions()
  }, [])

  async function fetchDefinitions() {
    try {
      const response = await fetch("/api/criteria-definitions")
      const result = await response.json()
      if (result.data) {
        setDefinitions(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch criteria definitions:", error)
    } finally {
      setLoading(false)
    }
  }

  const coreDefs = definitions.filter((d) => d.category === "core")
  const domainDefs = definitions.filter((d) => d.category === "domain")

  // Group domain criteria by domain_type
  const domainGroups = domainDefs.reduce<Record<string, CriteriaDefinition[]>>(
    (acc, def) => {
      const key = def.domain_type || "general"
      if (!acc[key]) acc[key] = []
      acc[key].push(def)
      return acc
    },
    {}
  )

  const toggleDomainCriterion = useCallback(
    (name: string, checked: boolean) => {
      const newDomain = checked
        ? [...criteria.domain, name]
        : criteria.domain.filter((n) => n !== name)

      // Clean up weights for removed criteria
      const newWeights = { ...criteria.weights }
      if (!checked) {
        delete newWeights[name]
      }

      onChange({ ...criteria, domain: newDomain, weights: newWeights })
    },
    [criteria, onChange]
  )

  const updateWeight = useCallback(
    (name: string, weight: number) => {
      const newWeights = { ...criteria.weights }
      if (weight === 1.0) {
        delete newWeights[name] // 1.0 is default, no need to store
      } else {
        newWeights[name] = weight
      }
      onChange({ ...criteria, weights: newWeights })
    },
    [criteria, onChange]
  )

  const getWeight = (name: string): number => {
    return criteria.weights[name] ?? 1.0
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Loading criteria catalog...
      </div>
    )
  }

  const allSelected = [...criteria.core, ...criteria.domain]

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Evaluation Criteria</h3>
          <p className="text-sm text-muted-foreground">
            Core criteria are always included. Select domain-specific criteria
            and adjust weights.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {allSelected.length} criteria selected (
            {criteria.core.length} core + {criteria.domain.length} domain)
          </p>
        </div>

        {/* Core Criteria — locked, always included */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Core Criteria
              <Badge variant="secondary" className="text-xs">
                Always included
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coreDefs.map((def) => (
                <CriterionRow
                  key={def.name}
                  definition={def}
                  weight={getWeight(def.name)}
                  onWeightChange={(w) => updateWeight(def.name, w)}
                  locked
                  selected
                />
              ))}
              {coreDefs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No core criteria found in catalog.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Domain Criteria — selectable per config */}
        {Object.entries(domainGroups).map(([domainType, defs]) => (
          <Card key={domainType}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                Domain: {domainType.replace(/_/g, " ")}
                <Badge variant="outline" className="text-xs">
                  {defs.filter((d) => criteria.domain.includes(d.name)).length}/
                  {defs.length} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {defs.map((def) => (
                  <CriterionRow
                    key={def.name}
                    definition={def}
                    weight={getWeight(def.name)}
                    onWeightChange={(w) => updateWeight(def.name, w)}
                    selected={criteria.domain.includes(def.name)}
                    onToggle={(checked) =>
                      toggleDomainCriterion(def.name, checked)
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  )
}

/** Single criterion row with checkbox, name, description tooltip, and weight input */
function CriterionRow({
  definition,
  weight,
  onWeightChange,
  locked,
  selected,
  onToggle,
}: {
  definition: CriteriaDefinition
  weight: number
  onWeightChange: (w: number) => void
  locked?: boolean
  selected: boolean
  onToggle?: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {locked ? (
        <div className="w-5 h-5 flex items-center justify-center">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ) : (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggle?.(checked === true)}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">
            {definition.name.replace(/_/g, " ")}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-sm">{definition.description}</p>
              {definition.scoring_guide && (
                <p className="text-xs text-muted-foreground mt-1">
                  {definition.scoring_guide}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
          {definition.category === "core" && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              core
            </Badge>
          )}
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Label className="text-xs text-muted-foreground">W:</Label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            value={weight}
            onChange={(e) => onWeightChange(parseFloat(e.target.value) || 1.0)}
            className="w-16 h-7 text-xs"
          />
        </div>
      )}
    </div>
  )
}
