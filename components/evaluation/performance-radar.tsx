"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts"
import type { CriteriaComparisonItem } from "@/lib/criteria-comparison"

interface PerformanceRadarProps {
  criteriaComparison: CriteriaComparisonItem[]
}

export function PerformanceRadar({ criteriaComparison }: PerformanceRadarProps) {
  const [chartView, setChartView] = useState<"all" | "persona" | "global">("all")

  const radarData = useMemo(() => {
    return criteriaComparison.map((c) => ({
      criteria: c.name,
      "This Conv": c.score,
      "Persona Avg": c.personaAvg,
      "Global Avg": c.globalAvg,
    }))
  }, [criteriaComparison])

  return (
    <Card className="border-2 border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black uppercase text-foreground">Performance Comparison</CardTitle>
          <div className="flex gap-2">
            {(["all", "persona", "global"] as const).map((view) => (
              <Button
                key={view}
                variant={chartView === view ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView(view)}
                className="uppercase text-xs font-bold"
              >
                {view === "all" ? "All" : view === "persona" ? "vs Persona" : "vs Global"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-gradient-to-br from-background/50 to-muted/10">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="criteria" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
            {(chartView === "all" || chartView === "persona") && (
              <Radar name="This Conv" dataKey="This Conv" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
            )}
            {chartView === "all" && (
              <>
                <Radar name="Persona Avg" dataKey="Persona Avg" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
                <Radar name="Global Avg" dataKey="Global Avg" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
              </>
            )}
            {chartView === "persona" && (
              <Radar name="Persona Avg" dataKey="Persona Avg" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} />
            )}
            {chartView === "global" && (
              <Radar name="Global Avg" dataKey="Global Avg" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.4} />
            )}
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
