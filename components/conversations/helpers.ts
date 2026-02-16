import type { PersonaPerformanceRow } from "@/lib/supabase"
import { parseConversationsSummary } from "@/lib/parsers"

/**
 * Parse conversation summary from JSON string.
 * Returns first element if array, otherwise the parsed object.
 */
export const getConversationSummary = (conv: PersonaPerformanceRow) => {
  const parsed = parseConversationsSummary(conv.conversations_summary)
  return Array.isArray(parsed) ? parsed[0] : parsed
}

/**
 * Parse criteria list from JSON string.
 * Returns array of criteria objects with criteria_name and score.
 */
export const getCriteriaList = (conv: PersonaPerformanceRow) => {
  try {
    const parsed = JSON.parse(conv.all_criteria_details || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Build criteria matrix for comparison view.
 * Returns array of criteria with scores for each conversation.
 */
export const buildCriteriaMatrix = (convs: PersonaPerformanceRow[]) => {
  const allCriteria = Array.from(
    new Set(convs.flatMap((conv) => getCriteriaList(conv).map((c: any) => c.criteria_name)))
  ).sort()

  return allCriteria.map((criteriaName) => {
    const scores: Record<string, number> = {}
    convs.forEach((conv) => {
      const criteria = getCriteriaList(conv).find((c: any) => c.criteria_name === criteriaName)
      scores[String(conv.conversationid)] = criteria?.score ?? 0
    })
    return { criteriaName, scores }
  })
}
