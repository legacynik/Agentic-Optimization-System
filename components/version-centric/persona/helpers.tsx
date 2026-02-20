import { Badge } from '@/components/ui/badge'
import { Persona } from './types'

/**
 * Returns status badge based on validation_status (P1-T6 lifecycle)
 * green=validated, red=rejected, yellow=pending_validation, blue=approved_override
 */
export const getStatusBadge = (persona: Persona) => {
  switch (persona.validation_status) {
    case 'validated':
      return <Badge className="bg-green-500 text-white">Validated</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>
    case 'approved_override':
      return <Badge className="bg-blue-500 text-white">Override</Badge>
    case 'pending_validation':
    default:
      return <Badge variant="secondary">Pending</Badge>
  }
}

/**
 * Returns validation score display with color coding
 */
export const getValidationScoreDisplay = (score: number | null | undefined) => {
  if (score == null) return null
  const color = score >= 7.0 ? 'text-green-600' : score >= 5.0 ? 'text-amber-600' : 'text-red-600'
  return <span className={`font-mono font-semibold ${color}`}>{score.toFixed(1)}</span>
}
