/**
 * EvidenceBadges Component
 *
 * Traffic light badges for evidence verification status (T12).
 * Shows green (exact match), yellow (pattern), red (unverified)
 * for each evidence item in analysis_report.insights[].
 *
 * @module components/agentic/evidence-badges
 */

'use client'

import { CheckCircle2, AlertCircle, HelpCircle, Shield } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { InsightsVerification } from '@/hooks/use-agent-details'

type VerificationStatus = 'exact' | 'pattern' | 'unverified'

const STATUS_CONFIG: Record<VerificationStatus, {
  icon: typeof CheckCircle2
  color: string
  label: string
  tooltip: string
}> = {
  exact: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    label: 'Verified',
    tooltip: 'Exact quote found in transcript',
  },
  pattern: {
    icon: AlertCircle,
    color: 'text-amber-500',
    label: 'Pattern',
    tooltip: 'Cross-conversation pattern observation',
  },
  unverified: {
    icon: HelpCircle,
    color: 'text-rose-400',
    label: 'Unverified',
    tooltip: 'Evidence not matched in transcripts',
  },
}

interface EvidenceBadgeProps {
  status: VerificationStatus
  className?: string
}

/** Single traffic light badge for one evidence item */
export function EvidenceBadge({ status, className }: EvidenceBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1', className)}>
            <Icon className={cn('h-3.5 w-3.5', config.color)} />
            <span className={cn('text-xs', config.color)}>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface VerificationSummaryBadgeProps {
  verification: InsightsVerification
  className?: string
}

/** Summary badge showing aggregate verification stats */
export function VerificationSummaryBadge({
  verification,
  className,
}: VerificationSummaryBadgeProps) {
  const { summary } = verification
  if (summary.total === 0) return null

  const verifiedPct = Math.round(
    ((summary.exact + summary.pattern) / summary.total) * 100
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md',
              'bg-muted/50 border',
              className
            )}
          >
            <Shield className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-emerald-600">{summary.exact}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-amber-600">{summary.pattern}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-rose-400">{summary.unverified}</span>
            <span className="text-muted-foreground">({verifiedPct}%)</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p className="font-medium mb-1">Evidence Verification</p>
          <p>{summary.exact} exact, {summary.pattern} pattern, {summary.unverified} unverified</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Returns the verification status for a specific evidence item.
 * Used by parent components that render insights with evidence.
 */
export function getEvidenceStatus(
  verification: InsightsVerification | null,
  insightIndex: number,
  evidenceIndex: number
): VerificationStatus | null {
  if (!verification?.items) return null

  const item = verification.items.find(
    v => v.insight_index === insightIndex && v.evidence_index === evidenceIndex
  )

  return item?.status ?? null
}
