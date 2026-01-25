/**
 * AgentDetails Component
 *
 * Collapsible details panel showing:
 * - Top issues (from failure_patterns)
 * - Score trend chart (Recharts)
 * - Personas outliers with horizontal bars (struggling and excelling)
 *
 * Uses semantic colors per spec:
 * - success: emerald-500
 * - warning: amber-500
 * - danger: rose-500
 *
 * @module components/agentic/agent-details
 */

'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Users,
  CircleAlert,
  CircleCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import type { PersonaScore } from '@/hooks/use-agent-details'

interface AgentDetailsProps {
  /** Top issues list */
  topIssues: string[]
  /** Score history for trend visualization */
  scoreHistory: Array<{ score: number; date: string }>
  /** Bottom performing personas */
  strugglingPersonas: PersonaScore[]
  /** Top performing personas */
  excellingPersonas: PersonaScore[]
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when "View Full Report" is clicked */
  onViewFullReport?: () => void
  /** Optional className */
  className?: string
}

/**
 * Trend chart component using Recharts
 */
function TrendChart({
  data,
  className,
}: {
  data: Array<{ score: number; date: string }>
  className?: string
}) {
  if (data.length < 2) return null

  // Determine color based on trend
  const firstScore = data[0].score
  const lastScore = data[data.length - 1].score
  const trendColor =
    lastScore > firstScore
      ? '#10b981' // emerald-500
      : lastScore < firstScore
        ? '#f43f5e' // rose-500
        : '#64748b' // slate-500

  return (
    <div className={cn('h-20 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
          <XAxis dataKey="date" hide />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border rounded-md px-2 py-1 text-xs shadow-md">
                    {(payload[0].value as number).toFixed(1)}
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={trendColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Persona score bar component - horizontal bar showing score out of 10
 */
function PersonaBar({
  persona,
  type,
}: {
  persona: PersonaScore
  type: 'struggling' | 'excelling'
}) {
  const isStruggling = type === 'struggling'
  const percentage = (persona.avgScore / 10) * 100

  // Color based on score thresholds
  const barColor = persona.avgScore >= 8
    ? 'bg-emerald-500'
    : persona.avgScore >= 6
      ? 'bg-amber-500'
      : 'bg-rose-500'

  const textColor = persona.avgScore >= 8
    ? 'text-emerald-600 dark:text-emerald-400'
    : persona.avgScore >= 6
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Icon */}
      {isStruggling ? (
        <CircleAlert className="h-4 w-4 text-rose-500 shrink-0" />
      ) : (
        <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />
      )}

      {/* Name */}
      <span className="font-medium w-28 truncate" title={persona.name}>
        {persona.name}
      </span>

      {/* Bar */}
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Score */}
      <span className={cn('font-medium w-8 text-right', textColor)}>
        {persona.avgScore.toFixed(1)}
      </span>
    </div>
  )
}

/**
 * AgentDetails - Collapsible agent details panel
 *
 * Displays expanded analysis when user clicks "See Details":
 * - Top issues from failure patterns
 * - Score trend sparkline
 * - Personas outliers (struggling and excelling)
 */
export function AgentDetails({
  topIssues,
  scoreHistory,
  strugglingPersonas,
  excellingPersonas,
  isLoading = false,
  onViewFullReport,
  className,
}: AgentDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No data state
  const hasData =
    topIssues.length > 0 ||
    scoreHistory.length > 0 ||
    strugglingPersonas.length > 0 ||
    excellingPersonas.length > 0

  if (!hasData) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No detailed analysis available yet. Run more tests to see insights.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Score data for trend calculation
  const firstScore = scoreHistory.length > 0 ? scoreHistory[0].score : undefined
  const lastScore = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : undefined
  const trendDelta = lastScore !== undefined && firstScore !== undefined
    ? (lastScore - firstScore).toFixed(1)
    : null

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Top Issues Section */}
          {topIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Top Issues</span>
              </div>
              <ul className="space-y-1 pl-6">
                {topIssues.map((issue, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trend Section */}
          {scoreHistory.length >= 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  <span>Trend (last {scoreHistory.length} runs)</span>
                </div>
                {trendDelta && (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      Number(trendDelta) > 0
                        ? 'text-emerald-600'
                        : Number(trendDelta) < 0
                          ? 'text-rose-600'
                          : 'text-muted-foreground'
                    )}
                  >
                    {firstScore?.toFixed(1)} → {lastScore?.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="border rounded-md p-2 bg-muted/30">
                <TrendChart data={scoreHistory} />
              </div>
            </div>
          )}

          {/* Personas Section */}
          {(strugglingPersonas.length > 0 || excellingPersonas.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-violet-600" />
                <span>Personas Performance</span>
              </div>

              {/* Struggling personas */}
              {strugglingPersonas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Struggling
                  </p>
                  <div className="space-y-2">
                    {strugglingPersonas.map((p) => (
                      <PersonaBar key={p.id} persona={p} type="struggling" />
                    ))}
                  </div>
                </div>
              )}

              {/* Excelling personas */}
              {excellingPersonas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Excelling
                  </p>
                  <div className="space-y-2">
                    {excellingPersonas.map((p) => (
                      <PersonaBar key={p.id} persona={p} type="excelling" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Full Report Button */}
          {onViewFullReport && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onViewFullReport}
            >
              View Full Report
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
