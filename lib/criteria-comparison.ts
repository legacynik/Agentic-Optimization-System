import type { PersonaPerformanceRow } from "./supabase"

export interface CriteriaComparisonItem {
  name: string
  score: number
  personaAvg: number
  globalAvg: number
}

export interface CriteriaComparisonResult {
  personaAvg: Record<string, number>
  globalAvg: Record<string, number>
  criteriaComparison: CriteriaComparisonItem[]
}

export function buildCriteriaComparison(
  conversation: PersonaPerformanceRow,
  allConversations: PersonaPerformanceRow[]
): CriteriaComparisonResult {
  if (!allConversations || allConversations.length === 0) {
    return { personaAvg: {}, globalAvg: {}, criteriaComparison: [] }
  }

  const personaConversations = allConversations.filter(
    (c) => c.personaid === conversation.personaid
  )

  // Persona averages
  const personaCriteriaMap = new Map<string, number[]>()
  personaConversations.forEach((conv) => {
    conv.all_criteria_details?.forEach((criteria) => {
      if (!personaCriteriaMap.has(criteria.criteria_name)) {
        personaCriteriaMap.set(criteria.criteria_name, [])
      }
      personaCriteriaMap.get(criteria.criteria_name)!.push(criteria.score)
    })
  })

  const personaAvg: Record<string, number> = {}
  personaCriteriaMap.forEach((scores, name) => {
    personaAvg[name] = scores.reduce((a, b) => a + b, 0) / scores.length
  })

  // Global averages
  const globalCriteriaMap = new Map<string, number[]>()
  allConversations.forEach((conv) => {
    conv.all_criteria_details?.forEach((criteria) => {
      if (!globalCriteriaMap.has(criteria.criteria_name)) {
        globalCriteriaMap.set(criteria.criteria_name, [])
      }
      globalCriteriaMap.get(criteria.criteria_name)!.push(criteria.score)
    })
  })

  const globalAvg: Record<string, number> = {}
  globalCriteriaMap.forEach((scores, name) => {
    globalAvg[name] = scores.reduce((a, b) => a + b, 0) / scores.length
  })

  const criteriaComparison = (conversation.all_criteria_details || []).map((criteria) => ({
    name: criteria.criteria_name,
    score: criteria.score,
    personaAvg: personaAvg[criteria.criteria_name] || 0,
    globalAvg: globalAvg[criteria.criteria_name] || 0,
  }))

  return { personaAvg, globalAvg, criteriaComparison }
}
