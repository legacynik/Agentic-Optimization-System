"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, Info } from "lucide-react"

interface OutlierData {
  p10: number
  p90: number
}

interface FilterBarProps {
  personas: Array<{ id: string; name: string }>
  selectedPersona: string | null
  onPersonaChange: (persona: string | null) => void
  selectedOutcomes: string[]
  onOutcomesChange: (outcomes: string[]) => void
  scoreRange: [number, number]
  onScoreRangeChange: (range: [number, number]) => void
  showBookedOnly: boolean
  onBookedToggle: () => void
  outliers: OutlierData
}

const outcomes = ["success", "partial", "failure"]
const scoreRanges = [
  { label: "0-3", value: [0, 3] as [number, number] },
  { label: "4-6", value: [4, 6] as [number, number] },
  { label: "7-8", value: [7, 8] as [number, number] },
  { label: "9-10", value: [9, 10] as [number, number] },
]

export function FilterBar({
  personas,
  selectedPersona,
  onPersonaChange,
  selectedOutcomes,
  onOutcomesChange,
  scoreRange,
  onScoreRangeChange,
  showBookedOnly,
  onBookedToggle,
  outliers,
}: FilterBarProps) {
  const toggleOutcome = (outcome: string) => {
    if (selectedOutcomes.includes(outcome)) {
      onOutcomesChange(selectedOutcomes.filter((o) => o !== outcome))
    } else {
      onOutcomesChange([...selectedOutcomes, outcome])
    }
  }

  const hasFilters =
    selectedPersona !== null ||
    selectedOutcomes.length > 0 ||
    scoreRange[0] !== 0 ||
    scoreRange[1] !== 10 ||
    showBookedOnly

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filters</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onPersonaChange(null)
              onOutcomesChange([])
              onScoreRangeChange([0, 10])
            }}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Persona (single select)</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Info className="h-3 w-3" />
                  P10: {outliers.p10.toFixed(1)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">10th percentile score (bottom performers)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Info className="h-3 w-3" />
                  P90: {outliers.p90.toFixed(1)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">90th percentile score (top performers)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-wrap gap-2">
          {personas.map((persona) => (
            <Badge
              key={persona.id}
              variant={selectedPersona === persona.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => onPersonaChange(selectedPersona === persona.id ? null : persona.id)}
            >
              {persona.id}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Outcomes</label>
        <div className="flex flex-wrap gap-2">
          {outcomes.map((outcome) => (
            <Badge
              key={outcome}
              variant={selectedOutcomes.includes(outcome) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80 capitalize"
              onClick={() => toggleOutcome(outcome)}
            >
              {outcome}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Score Range</label>
        <div className="flex flex-wrap gap-2">
          {scoreRanges.map((range) => (
            <Badge
              key={range.label}
              variant={scoreRange[0] === range.value[0] && scoreRange[1] === range.value[1] ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => onScoreRangeChange(range.value)}
            >
              {range.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Additional Filters</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Switch id="booked-toggle" checked={showBookedOnly} onCheckedChange={onBookedToggle} />
            <Label htmlFor="booked-toggle" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Calendar className="h-4 w-4" />
              Show Booked Only
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
