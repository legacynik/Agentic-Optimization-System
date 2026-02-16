import { Badge } from '@/components/ui/badge'
import { Persona } from './types'

/**
 * Returns status badge based on validation_status (v2.4: only 2 states)
 * @see PRD 10.8 for badge specifications
 */
export const getStatusBadge = (persona: Persona) => {
  switch (persona.validation_status) {
    case 'validated':
      return <Badge className="bg-green-500 text-white">✓ Validated</Badge>
    default:
      return <Badge variant="secondary">Pending Validation</Badge>
  }
}
