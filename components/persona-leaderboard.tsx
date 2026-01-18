"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingDown } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface PersonaLeaderboardProps {
  conversations: PersonaPerformanceRow[]
}

interface PersonaRanking {
  personaId: string
  name: string
  avgScore: number
  rank: number
  trend: number[] // Last 7 data points for sparkline
}

export function PersonaLeaderboard({ conversations }: PersonaLeaderboardProps) {
  const rankings = useMemo<PersonaRanking[]>(() => {
    if (conversations.length === 0) return []

    // Group by persona and calculate avg score
    const personaMap = new Map<string, { scores: number[]; name: string }>()

    conversations.forEach((conv) => {
      if (!personaMap.has(conv.personaid)) {
        personaMap.set(conv.personaid, {
          scores: [],
          name: conv.personaid,
        })
      }
      personaMap.get(conv.personaid)!.scores.push(conv.avg_score)
    })

    // Calculate averages and create rankings
    const personaRankings: PersonaRanking[] = []
    personaMap.forEach((data, personaId) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      // Use last 7 scores for sparkline (or all if less than 7)
      const trend = data.scores.slice(-7)
      personaRankings.push({
        personaId,
        name: data.name,
        avgScore,
        rank: 0, // Will set after sorting
        trend,
      })
    })

    // Sort by avgScore descending
    personaRankings.sort((a, b) => b.avgScore - a.avgScore)

    // Assign ranks
    personaRankings.forEach((p, index) => {
      p.rank = index + 1
    })

    return personaRankings
  }, [conversations])

  const topThree = rankings.slice(0, 3)
  const bottomThree = rankings.slice(-3).reverse()

  const renderSparkline = (trend: number[]) => {
    if (trend.length === 0) return null

    const max = Math.max(...trend)
    const min = Math.min(...trend)
    const range = max - min || 1

    const bars = trend.map((value, index) => {
      const height = ((value - min) / range) * 100
      return (
        <div
          key={index}
          className="flex-1 bg-primary/20 relative"
          style={{
            height: "20px",
          }}
        >
          <div
            className="absolute bottom-0 w-full bg-primary"
            style={{
              height: `${height}%`,
            }}
          />
        </div>
      )
    })

    return <div className="flex gap-0.5 items-end h-5 w-20">{bars}</div>
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return null
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Persona Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Persona Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top 3 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
          {topThree.map((persona) => (
            <div
              key={persona.personaId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{getMedalEmoji(persona.rank)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{persona.name}</p>
                  <p className="text-sm text-muted-foreground">Rank #{persona.rank}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {renderSparkline(persona.trend)}
                <Badge variant="default" className="ml-2">
                  {persona.avgScore.toFixed(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom 3 (if more than 3 personas) */}
        {rankings.length > 3 && bottomThree.length > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Needs Improvement
            </p>
            {bottomThree.map((persona) => (
              <div
                key={persona.personaId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">📉</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{persona.name}</p>
                    <p className="text-sm text-muted-foreground">Rank #{persona.rank}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {renderSparkline(persona.trend)}
                  <Badge variant="secondary" className="ml-2">
                    {persona.avgScore.toFixed(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
