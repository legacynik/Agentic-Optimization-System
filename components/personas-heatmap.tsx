"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getHeatmapCellColor } from "@/lib/score-utils"

interface PersonasHeatmapProps {
  data: Array<{
    persona: string
    [key: string]: number | string
  }>
  loading?: boolean
  error?: string
}

export function PersonasHeatmap({ data, loading = false, error }: PersonasHeatmapProps) {

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-6 gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No heatmap data available
        </CardContent>
      </Card>
    )
  }

  let criteria: string[]

  try {
    criteria = Object.keys(data[0]).filter((key) => key !== "persona")

    if (criteria.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No criteria found in data
          </CardContent>
        </Card>
      )
    }
  } catch (transformError) {
    console.error("[PersonasHeatmap] Error transforming data:", transformError)
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Processing Heatmap Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to process heatmap data. The data may be malformed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `200px repeat(${criteria.length}, 1fr)` }}>
          <div className="text-xs font-medium text-muted-foreground">Persona ID</div>
          {criteria.map((criterion) => (
            <div key={criterion} className="text-xs font-medium text-center text-muted-foreground truncate">
              {criterion}
            </div>
          ))}
        </div>

        {/* Heatmap Rows */}
        <div className="space-y-2">
          {data.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-2"
              style={{ gridTemplateColumns: `200px repeat(${criteria.length}, 1fr)` }}
            >
              <div className="text-xs font-medium text-foreground flex items-center pr-2">{row.persona}</div>
              {criteria.map((criterion) => {
                const value = row[criterion]
                const score = typeof value === "number" ? value : 0
                return (
                  <div
                    key={criterion}
                    className={`text-xs font-semibold rounded px-2 py-3 text-center ${getHeatmapCellColor(score)}`}
                  >
                    {typeof value === "number" ? value.toFixed(1) : "N/A"}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
