/**
 * Persona interface matching the database schema (v2.4)
 * validation_status: only 'pending' or 'validated' (simplified from 5 states)
 */
export interface Persona {
  id: string
  name: string
  description: string | null
  psychological_profile: string | null
  personaprompt: string | null
  category: string | null
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  behaviors: string[] | null
  created_by: 'ai' | 'human' | 'template'
  validated_by_human: boolean
  validation_status: 'pending' | 'validated'  // v2.4: only 2 states
  feedback_notes?: FeedbackNote[]
}

/**
 * Feedback note structure for persona feedback
 */
export interface FeedbackNote {
  note: string
  category?: 'behavior' | 'difficulty' | 'realism' | 'other'
  created_at: string
}

export interface PersonaWorkshopProps {
  promptName: string
  promptVersion: string
  onPersonasSaved?: (personas: Persona[]) => void
}

/**
 * Returns difficulty color classes based on difficulty level
 */
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-50'
    case 'medium': return 'text-yellow-600 bg-yellow-50'
    case 'hard': return 'text-orange-600 bg-orange-50'
    case 'extreme': return 'text-red-600 bg-red-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}
