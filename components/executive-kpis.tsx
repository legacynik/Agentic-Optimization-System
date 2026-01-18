"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Calendar, TrendingUp, Zap, ArrowUp, ArrowDown } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface ExecutiveKPIsProps {
  conversations: PersonaPerformanceRow[]
}

interface KPIData {
  title: string
  value: string | number
  change: number
  trend: "up" | "down" | "neutral"
  icon: any
  suffix?: string
}

export function ExecutiveKPIs({ conversations }: ExecutiveKPIsProps) {
  const kpis = useMemo<KPIData[]>(() => {
    if (conversations.length === 0) {
      return [
        { title: "Success Rate", value: "0%", change: 0, trend: "neutral", icon: CheckCircle2 },
        { title: "Appointments", value: 0, change: 0, trend: "neutral", icon: Calendar },
        { title: "Avg Score", value: "0.0", change: 0, trend: "neutral", icon: TrendingUp },
        { title: "Avg Efficiency", value: "0.0", change: 0, trend: "neutral", icon: Zap, suffix: "turns" },
      ]
    }

    // Calculate success rate (score >= 8)
    const successfulConvs = conversations.filter((c) => c.avg_score >= 8).length
    const successRate = ((successfulConvs / conversations.length) * 100).toFixed(0)

    // Calculate total appointments (if conversations have appointment field)
    const totalAppointments = conversations.reduce((sum, conv) => {
      const summary = Array.isArray(conv.conversations_summary)
        ? conv.conversations_summary
        : typeof conv.conversations_summary === "string"
          ? JSON.parse(conv.conversations_summary || "[]")
          : []
      const hasAppointment = summary.some((s: any) => s.appointment_booked === true)
      return sum + (hasAppointment ? 1 : 0)
    }, 0)

    // Calculate average score
    const avgScore = (
      conversations.reduce((sum, c) => sum + c.avg_score, 0) / conversations.length
    ).toFixed(1)

    // Calculate average turns (efficiency)
    const avgTurns = (
      conversations.reduce((sum, c) => sum + c.avg_turns, 0) / conversations.length
    ).toFixed(1)

    // Mock trend calculations (in real app, compare with previous period)
    // For demo: use small random variations
    const successRateChange = 5 // +5%
    const appointmentsChange = 12 // +12
    const avgScoreChange = 0.3 // +0.3
    const avgTurnsChange = -0.2 // -0.2 (lower is better)

    return [
      {
        title: "Success Rate",
        value: `${successRate}%`,
        change: successRateChange,
        trend: successRateChange > 0 ? "up" : successRateChange < 0 ? "down" : "neutral",
        icon: CheckCircle2,
      },
      {
        title: "Appointments",
        value: totalAppointments,
        change: appointmentsChange,
        trend: appointmentsChange > 0 ? "up" : appointmentsChange < 0 ? "down" : "neutral",
        icon: Calendar,
      },
      {
        title: "Avg Score",
        value: avgScore,
        change: avgScoreChange,
        trend: avgScoreChange > 0 ? "up" : avgScoreChange < 0 ? "down" : "neutral",
        icon: TrendingUp,
      },
      {
        title: "Avg Efficiency",
        value: avgTurns,
        change: avgTurnsChange,
        trend: avgTurnsChange < 0 ? "up" : avgTurnsChange > 0 ? "down" : "neutral", // Lower turns = better
        icon: Zap,
        suffix: "turns",
      },
    ]
  }, [conversations])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{kpi.value}</p>
                  {kpi.suffix && <span className="text-sm text-muted-foreground">{kpi.suffix}</span>}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {kpi.trend === "up" && (
                    <>
                      <ArrowUp className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">
                        {kpi.change > 0 ? "+" : ""}
                        {kpi.change}
                        {kpi.suffix === "turns" ? "" : "%"}
                      </span>
                    </>
                  )}
                  {kpi.trend === "down" && (
                    <>
                      <ArrowDown className="h-4 w-4 text-red-500" />
                      <span className="text-red-500">
                        {kpi.change}
                        {kpi.suffix === "turns" ? "" : "%"}
                      </span>
                    </>
                  )}
                  {kpi.trend === "neutral" && <span className="text-muted-foreground">No change</span>}
                  <span className="text-muted-foreground ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <kpi.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
