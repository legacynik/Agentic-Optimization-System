/**
 * HealthMonitor Component
 *
 * Card displaying agent health metrics: current score, trend sparkline, outcome bars, and insight.
 * Shows at-a-glance status of how the agent is performing.
 *
 * Uses Recharts for sparkline visualization and semantic colors per spec:
 * - success: emerald-500
 * - warning: amber-500
 * - danger: rose-500
 * - primary: violet-600
 *
 * @module components/agentic/health-monitor
 */

'use client'

import { TrendingDown, TrendingUp, Minus, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

/** Score history point for sparkline */
interface ScorePoint {
  score: number
  date: string
}

/** Outcome distribution for bars */
export interface OutcomeDistribution {
  success: number
  partial: number
  failure: number
  timeout: number
}

interface HealthMonitorProps {
  /** Current average score (0-10) */
  score: number | null
  /** Score change from previous run (positive = improvement) */
  trend: number | null
  /** Score history for sparkline visualization */
  scoreHistory?: ScorePoint[]
  /** Outcome distribution (counts or percentages) */
  outcomes?: OutcomeDistribution | null
  /** Target score goal */
  goalScore?: number
  /** Short insight about agent performance */
  insight?: string | null
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when "See Details" is clicked */
  onSeeDetails?: () => void
  /** Callback when "Optimize" is clicked */
  onOptimize?: () => void
  /** Optional className */
  className?: string
}

/**
 * Returns health status based on score
 */
function getHealthStatus(score: number | null): 'healthy' | 'warning' | 'critical' | 'unknown' {
  if (score === null) return 'unknown'
  if (score >= 8) return 'healthy'
  if (score >= 6) return 'warning'
  return 'critical'
}

/**
 * Returns semantic colors for health status
 * Using emerald/amber/rose per spec
 */
function getStatusColors(status: 'healthy' | 'warning' | 'critical' | 'unknown') {
  switch (status) {
    case 'healthy':
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        fill: '#10b981' // emerald-500
      }
    case 'warning':
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        fill: '#f59e0b' // amber-500
      }
    case 'critical':
      return {
        text: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        fill: '#f43f5e' // rose-500
      }
    default:
      return {
        text: 'text-muted-foreground',
        bg: 'bg-muted',
        fill: '#64748b' // slate-500
      }
  }
}

/**
 * Sparkline component using Recharts
 */
function Sparkline({ data, color }: { data: ScorePoint[]; color: string }) {
  if (data.length < 2) return null

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
          <Line
            type="monotone"
            dataKey="score"
            stroke={color}
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
 * Outcome bars component showing success/partial/failure distribution
 */
function OutcomeBars({ outcomes }: { outcomes: OutcomeDistribution }) {
  const total = outcomes.success + outcomes.partial + outcomes.failure + outcomes.timeout
  if (total === 0) return null

  const successPct = Math.round((outcomes.success / total) * 100)
  const partialPct = Math.round((outcomes.partial / total) * 100)
  const failurePct = Math.round((outcomes.failure / total) * 100)
  const timeoutPct = Math.round((outcomes.timeout / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden flex">
          {successPct > 0 && (
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${successPct}%` }}
            />
          )}
          {partialPct > 0 && (
            <div
              className="h-full bg-amber-500"
              style={{ width: `${partialPct}%` }}
            />
          )}
          {failurePct > 0 && (
            <div
              className="h-full bg-rose-500"
              style={{ width: `${failurePct}%` }}
            />
          )}
          {timeoutPct > 0 && (
            <div
              className="h-full bg-gray-400"
              style={{ width: `${timeoutPct}%` }}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-emerald-600 dark:text-emerald-400">
          Success: {successPct}%
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          Partial: {partialPct}%
        </span>
        <span className="text-rose-600 dark:text-rose-400">
          Failure: {failurePct}%
        </span>
        {timeoutPct > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            Timeout: {timeoutPct}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * HealthMonitor - Agent health status card
 *
 * Displays:
 * - Current score with large typography
 * - Trend indicator (up/down/flat)
 * - Sparkline chart for score history
 * - Outcome bars (success/partial/failure)
 * - Brief insight text
 * - Action buttons
 */
export function HealthMonitor({
  score,
  trend,
  scoreHistory = [],
  outcomes,
  goalScore = 8.0,
  insight,
  isLoading = false,
  onSeeDetails,
  onOptimize,
  className,
}: HealthMonitorProps) {
  const status = getHealthStatus(score)
  const colors = getStatusColors(status)

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Health Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 animate-pulse">
            <div className="h-16 w-24 bg-muted rounded" />
            <div className="h-14 w-full bg-muted rounded" />
            <div className="h-6 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (score === null) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Health Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No test data available. Run a test to see health metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          Health Monitor
          {status === 'healthy' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          {status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          {status === 'critical' && <AlertCircle className="h-5 w-5 text-rose-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {/* Score and Trend Row */}
          <div className="flex items-start justify-between gap-4">
            {/* Score display */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-5xl font-bold', colors.text)}>
                  {score.toFixed(1)}
                </span>
                {trend !== null && trend !== 0 && (
                  <span className={cn(
                    'flex items-center text-sm',
                    trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {trend > 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                  </span>
                )}
                {trend === 0 && (
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Minus className="h-4 w-4 mr-1" />
                    0.0
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Goal: {goalScore.toFixed(1)}
              </span>
            </div>

            {/* Sparkline */}
            {scoreHistory.length >= 2 && (
              <div className="flex-1 max-w-[180px]">
                <div className="text-xs text-muted-foreground mb-1">Trend</div>
                <Sparkline data={scoreHistory} color={colors.fill} />
              </div>
            )}
          </div>

          {/* Outcome Bars */}
          {outcomes && <OutcomeBars outcomes={outcomes} />}

          {/* Insight text */}
          {insight && (
            <div className={cn('flex items-start gap-2 p-3 rounded-md w-full', colors.bg)}>
              <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0', colors.text)} />
              <p className="text-sm">{insight}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            {onSeeDetails && (
              <Button variant="outline" className="flex-1" onClick={onSeeDetails}>
                See Details
              </Button>
            )}
            {onOptimize && (
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={onOptimize}>
                Optimize
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
