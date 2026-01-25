'use client'

/**
 * Personas Page - Lists all personas with management capabilities
 * Uses PersonaWorkshop component for display and validation
 */

import { PersonaWorkshop } from '@/components/version-centric/persona-workshop'

export default function PersonasPage() {
  return (
    <div className="container mx-auto p-6">
      <PersonaWorkshop
        promptName=""
        promptVersion=""
      />
    </div>
  )
}
