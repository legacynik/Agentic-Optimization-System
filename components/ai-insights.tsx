"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { parseConversationsSummary } from "@/lib/parsers"

interface AIInsightsProps {
  conversations: PersonaPerformanceRow[]
  loading?: boolean
  error?: string
}

type InsightType = "success" | "warning" | "neutral" | "trend"

interface Insight {
  type: InsightType
  title: string
  description: string
  icon: React.ReactNode
}

export function AIInsights({ conversations, loading = false, error }: AIInsightsProps) {
  const insights = useMemo(() => {
    try {
      if (conversations.length === 0) {
        return []
      }

      const generatedInsights: Insight[] = []

    // 1. Efficiency Trend
    // Compare last 5 conversations vs previous 5
    const sortedConvs = [...conversations].sort((a, b) => 
      new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    )
    
    if (sortedConvs.length >= 10) {
      const recent = sortedConvs.slice(0, 5)
      const previous = sortedConvs.slice(5, 10)
      
      const recentAvgTurns = recent.reduce((sum, c) => sum + c.avg_turns, 0) / recent.length
      const prevAvgTurns = previous.reduce((sum, c) => sum + c.avg_turns, 0) / previous.length
      const diff = recentAvgTurns - prevAvgTurns
      
      if (Math.abs(diff) > 1) {
        const isImprovement = diff < 0
        generatedInsights.push({
          type: isImprovement ? "success" : "warning",
          title: "Efficiency Trend",
          description: `Conversations are ${Math.abs(diff).toFixed(1)} turns ${isImprovement ? "shorter" : "longer"} on average compared to previous runs.`,
          icon: isImprovement ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />
        })
      }
    }

    // 2. Top Performing Persona
    const personaScores = new Map<string, number[]>()
    conversations.forEach((conv) => {
      if (!personaScores.has(conv.personaid)) {
        personaScores.set(conv.personaid, [])
      }
      personaScores.get(conv.personaid)!.push(conv.avg_score)
    })

    if (personaScores.size > 0) {
      const personaAvgs = Array.from(personaScores.entries()).map(([id, scores]) => ({
        id,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      const topPersona = personaAvgs.sort((a, b) => b.avg - a.avg)[0]
      
      if (topPersona.avg >= 8.5) {
        generatedInsights.push({
          type: "success",
          title: "Top Performer",
          description: `${topPersona.id} is consistently performing well with an average score of ${topPersona.avg.toFixed(1)}.`,
          icon: <CheckCircle2 className="h-4 w-4" />
        })
      }
    }

    // 3. Booking Rate Analysis
    const totalBookings = conversations.filter((conv) => {
      const summary = parseConversationsSummary(conv.conversations_summary)
      return summary.some((s: any) => s.appointment_booked === true)
    }).length
    
    const bookingRate = (totalBookings / conversations.length) * 100
    
    if (bookingRate > 30) {
      generatedInsights.push({
        type: "success",
        title: "High Conversion",
        description: `Booking rate is strong at ${bookingRate.toFixed(0)}%, indicating effective call-to-action performance.`,
        icon: <TrendingUp className="h-4 w-4" />
      })
    } else if (bookingRate < 10 && conversations.length > 10) {
      generatedInsights.push({
        type: "warning",
        title: "Low Conversion",
        description: `Booking rate is ${bookingRate.toFixed(0)}%. Consider reviewing the appointment setting script.`,
        icon: <AlertTriangle className="h-4 w-4" />
      })
    }

    // 4. Category Analysis (Failure Patterns)
    const categoryStats = new Map<string, { total: number; failures: number }>()
    conversations.forEach((conv) => {
      const category = conv.persona_category || "Unknown"
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { total: 0, failures: 0 })
      }
      const stats = categoryStats.get(category)!
      stats.total++
      if (conv.avg_score < 6) {
        stats.failures++
      }
    })

    const highFailureCategory = Array.from(categoryStats.entries())
      .find(([_, stats]) => stats.total >= 3 && (stats.failures / stats.total) > 0.3)

    if (highFailureCategory) {
      const [category, stats] = highFailureCategory
      const failureRate = ((stats.failures / stats.total) * 100).toFixed(0)
      generatedInsights.push({
        type: "warning",
        title: "Attention Needed",
        description: `${category} category has a ${failureRate}% failure rate. Review these conversations for patterns.`,
        icon: <AlertTriangle className="h-4 w-4" />
      })
    }

      return generatedInsights.slice(0, 4)
    } catch (insightError) {
      console.error("[AIInsights] Error generating insights:", insightError)
      return []
    }
  }, [conversations])

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[80px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Error state - render empty to not break layout
  if (error) {
    console.error("[AIInsights] Error:", error)
    return null
  }

  if (insights.length === 0) {
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              insight.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                : insight.type === "warning"
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                : "bg-accent/50 border-border"
            }`}
          >
            <div className={`mt-0.5 ${
              insight.type === "success" ? "text-green-600 dark:text-green-400" :
              insight.type === "warning" ? "text-yellow-600 dark:text-yellow-400" :
              "text-muted-foreground"
            }`}>
              {insight.icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-0.5">{insight.title}</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
