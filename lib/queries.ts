import { getSupabase } from "./supabase"
import type { PersonaPerformanceRow } from "./supabase"

/**
 * Retry wrapper for Supabase queries
 * Only retries on specific transient errors (invalid API key during init)
 * Max 2 retries with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 100): Promise<T> {
  console.log(`[Queries] withRetry: Attempt ${3 - retries}/3`)

  try {
    const result = await fn()
    console.log("[Queries] withRetry: Success")
    return result
  } catch (error: any) {
    console.error("[Queries] withRetry: Error caught", error?.message)

    // Only retry on specific initialization errors, not on all errors
    if (retries > 0 && (error.message?.includes("Invalid API key") || error.message?.includes("supabaseUrl"))) {
      console.log(`[Queries] withRetry: Retrying after ${delay}ms... (${retries} retries left)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }

    // Don't retry other errors
    console.error("[Queries] withRetry: No more retries, throwing error")
    throw error
  }
}

/**
 * Fetches all personas performance data from the VIEW
 * Returns empty array if no data (valid state for new installations)
 */
export async function fetchPersonasPerformance() {
  console.log("[Queries] fetchPersonasPerformance: Starting...")

  return withRetry(async () => {
    const supabase = getSupabase()
    console.log("[Queries] fetchPersonasPerformance: Got Supabase client")

    const { data, error } = await supabase
      .from("personas_performance")
      .select("*")
      .order("test_date", { ascending: false })

    console.log("[Queries] fetchPersonasPerformance: Query completed", {
      hasData: !!data,
      count: data?.length || 0,
      hasError: !!error
    })

    if (error) {
      console.error("[Queries] Error fetching personas_performance:", error)
      throw error
    }

    // Return empty array if no data (valid state)
    return (data || []) as PersonaPerformanceRow[]
  })
}

export async function fetchTestRuns() {
  return withRetry(async () => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("personas_performance")
      .select("testrunid, test_date, avg_score, conversations_summary")
      .order("test_date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching test runs:", error)
      throw error
    }

    // Group by testrunid and calculate distributions based on avg_score
    const testRunsMap = new Map()

    data?.forEach((row: PersonaPerformanceRow) => {
      if (!testRunsMap.has(row.testrunid)) {
        testRunsMap.set(row.testrunid, {
          id: row.testrunid,
          date: new Date(row.test_date).toLocaleDateString(),
          scores: [],
          distribution: { success: 0, partial: 0, failure: 0 },
        })
      }

      const testRun = testRunsMap.get(row.testrunid)
      testRun.scores.push(row.avg_score)

      // Each row = 1 conversation, classify by avg_score
      const score = row.avg_score
      if (typeof score === "number") {
        if (score >= 8) {
          testRun.distribution.success++
        } else if (score >= 6) {
          testRun.distribution.partial++
        } else {
          testRun.distribution.failure++
        }
      }
    })

    return Array.from(testRunsMap.values()).map((run) => ({
      ...run,
      avgScore: (run.scores.reduce((a: number, b: number) => a + b, 0) / run.scores.length).toFixed(1),
    }))
  })
}

export async function fetchUniquePersonas() {
  return withRetry(async () => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("personas_performance")
      .select("personaid, persona_description, persona_category")

    if (error) {
      console.error("[v0] Error fetching personas:", error)
      throw error
    }

    // Get unique personas
    const personasMap = new Map()
    data?.forEach((row: PersonaPerformanceRow) => {
      if (!personasMap.has(row.personaid)) {
        personasMap.set(row.personaid, {
          id: row.personaid,
          name: row.personaid,
          description: row.persona_description,
          category: row.persona_category,
        })
      }
    })

    return Array.from(personasMap.values())
  })
}

export async function fetchUniqueCategories() {
  return withRetry(async () => {
    const supabase = getSupabase()

    const { data, error } = await supabase.from("personas_performance").select("persona_category")

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      throw error
    }

    // Get unique categories
    const categoriesSet = new Set<string>()
    data?.forEach((row: PersonaPerformanceRow) => {
      if (row.persona_category) {
        categoriesSet.add(row.persona_category)
      }
    })

    return Array.from(categoriesSet).sort()
  })
}

export async function fetchHeatmapData() {
  return withRetry(async () => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("personas_performance")
      .select("personaid, persona_description, all_criteria_details")

    if (error) {
      console.error("[v0] Error fetching heatmap data:", error)
      throw error
    }

    // Group by persona and calculate average scores per criteria
    const heatmapMap = new Map()

    data?.forEach((row: PersonaPerformanceRow) => {
      if (!heatmapMap.has(row.personaid)) {
        heatmapMap.set(row.personaid, {
          persona: row.personaid,
          criteriaScores: new Map(),
        })
      }

      const personaData = heatmapMap.get(row.personaid)

      row.all_criteria_details?.forEach((criteria) => {
        if (!personaData.criteriaScores.has(criteria.criteria_name)) {
          personaData.criteriaScores.set(criteria.criteria_name, [])
        }
        personaData.criteriaScores.get(criteria.criteria_name).push(criteria.score)
      })
    })

    return Array.from(heatmapMap.values()).map((personaData) => {
      const scores: Record<string, number> = {}
      personaData.criteriaScores.forEach((scoreArray: number[], criteriaName: string) => {
        scores[criteriaName] = scoreArray.reduce((a: number, b: number) => a + b, 0) / scoreArray.length
      })
      return {
        persona: personaData.persona,
        ...scores,
      }
    })
  })
}

/**
 * Update human notes for a conversation
 * Updates directly on old_conversations table (atomic, no race condition)
 */
export async function updateConversationNotes(
  conversationId: number,
  notes: string
): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabase()

    // Atomic update directly on the source table (no fetch needed)
    const { error: updateError } = await supabase
      .from("old_conversations")
      .update({ human_notes: notes })
      .eq("conversationid", conversationId)

    if (updateError) {
      console.error("[Queries] Error updating conversation notes:", updateError)
      throw updateError
    }

    console.log("[Queries] Successfully updated notes for conversation", conversationId)
  })
}
