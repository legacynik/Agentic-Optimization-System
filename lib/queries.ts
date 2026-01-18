import { getSupabase } from "./supabase"
import type { PersonaPerformanceRow } from "./supabase"

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 100): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes("Invalid API key") || error.message?.includes("supabaseUrl"))) {
      console.log(`[v0] Retrying after ${delay}ms... (${retries} retries left)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }
    throw error
  }
}

export async function fetchPersonasPerformance() {
  return withRetry(async () => {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("personas_performance")
      .select("*")
      .order("test_date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching personas_performance:", error)
      throw error
    }

    return data as PersonaPerformanceRow[]
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
 * Note: This updates the conversations_summary JSON field with the new human_notes value
 */
export async function updateConversationNotes(
  conversationId: number,
  notes: string
): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabase()

    // First, fetch the current row to get the conversations_summary
    const { data: currentData, error: fetchError } = await supabase
      .from("personas_performance")
      .select("conversations_summary")
      .eq("conversationid", conversationId)
      .single()

    if (fetchError) {
      console.error("[v0] Error fetching conversation for update:", fetchError)
      throw fetchError
    }

    // Parse and update the conversations_summary
    let summary = currentData.conversations_summary
    if (typeof summary === 'string') {
      try {
        summary = JSON.parse(summary)
      } catch {
        summary = []
      }
    }

    // Update the first conversation's human_notes (or all if they share the same conversation)
    if (Array.isArray(summary) && summary.length > 0) {
      summary[0].human_notes = notes
    }

    // Update back to database
    const { error: updateError } = await supabase
      .from("personas_performance")
      .update({ conversations_summary: summary })
      .eq("conversationid", conversationId)

    if (updateError) {
      console.error("[v0] Error updating conversation notes:", updateError)
      throw updateError
    }

    console.log("[v0] Successfully updated notes for conversation", conversationId)
  })
}
