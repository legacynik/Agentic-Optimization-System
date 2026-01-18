"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

interface SimpleTrendsProps {
  conversations: PersonaPerformanceRow[]
}

export function SimpleTrends({ conversations }: SimpleTrendsProps) {
  const trendData = useMemo(() => {
    if (conversations.length === 0) return []

    // Group conversations by date and calculate daily averages
    const dateMap = new Map<string, { scores: number[]; turns: number[] }>()

    conversations.forEach((conv) => {
      const date = new Date(conv.test_date).toISOString().split("T")[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { scores: [], turns: [] })
      }
      dateMap.get(date)!.scores.push(conv.avg_score)
      dateMap.get(date)!.turns.push(conv.avg_turns)
    })

    // Convert to chart data
    const chartData = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
        turns: Number((data.turns.reduce((a, b) => a + b, 0) / data.turns.length).toFixed(1)),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days for better trend visibility

    return chartData
  }, [conversations])

  if (trendData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No trend data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTurns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                domain={[0, 10]}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
                        <p className="font-medium mb-2 text-sm">{payload[0].payload.date}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-violet-500" />
                              <span className="text-muted-foreground">Avg Score</span>
                            </div>
                            <span className="font-bold font-mono text-violet-500">{payload[0].value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-500" />
                              <span className="text-muted-foreground">Avg Turns</span>
                            </div>
                            <span className="font-bold font-mono text-cyan-500">{payload[1].value}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorScore)"
                name="Avg Score"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="turns"
                stroke="#06b6d4"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTurns)"
                name="Avg Turns"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
