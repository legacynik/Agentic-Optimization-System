"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, Info, Search } from "lucide-react"

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
  const hasFilters =
    selectedPersona !== null ||
    selectedOutcomes.length > 0 ||
    scoreRange[0] !== 0 ||
    scoreRange[1] !== 10 ||
    showBookedOnly

  const handleOutcomeChange = (values: string[]) => {
    onOutcomesChange(values)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Persona Select */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Persona</Label>
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
          <Select
            value={selectedPersona || "all"}
            onValueChange={(value) => onPersonaChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All personas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All personas</SelectItem>
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Outcomes ToggleGroup */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Outcomes</Label>
          <ToggleGroup
            type="multiple"
            value={selectedOutcomes}
            onValueChange={handleOutcomeChange}
            className="justify-start"
          >
            <ToggleGroupItem value="success" aria-label="Toggle success">
              Success
            </ToggleGroupItem>
            <ToggleGroupItem value="partial" aria-label="Toggle partial">
              Partial
            </ToggleGroupItem>
            <ToggleGroupItem value="failure" aria-label="Toggle failure">
              Failure
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Score Range */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Score Range</Label>
          <div className="flex flex-wrap gap-2">
            {scoreRanges.map((range) => (
              <Badge
                key={range.label}
                variant={
                  scoreRange[0] === range.value[0] && scoreRange[1] === range.value[1]
                    ? "default"
                    : "outline"
                }
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => onScoreRangeChange(range.value)}
              >
                {range.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Additional Filters */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Options</Label>
          <div className="flex items-center space-x-2">
            <Switch id="booked-toggle" checked={showBookedOnly} onCheckedChange={onBookedToggle} />
            <Label htmlFor="booked-toggle" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Calendar className="h-4 w-4" />
              Booked Only
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
