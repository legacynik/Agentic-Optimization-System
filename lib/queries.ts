import { getSupabase } from "./supabase"
import type { PersonaPerformanceRow } from "./supabase"
import type { TestRunSummary, PersonaSummary, HeatmapRow } from "./types/dashboard"

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 100): Promise<T> {
  try {
    return await fn()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)

    if (retries > 0 && (message.includes("Invalid API key") || message.includes("supabaseUrl"))) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }

    throw error
  }
}

export async function fetchPersonasPerformance(): Promise<PersonaPerformanceRow[]> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("personas_performance")
      .select("*")
      .order("test_date", { ascending: false })

    if (error) {
      console.error("[Queries] fetchPersonasPerformance:", error)
      throw error
    }

    return (data || []) as PersonaPerformanceRow[]
  })
}

export async function fetchTestRuns(): Promise<TestRunSummary[]> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("personas_performance")
      .select("testrunid, test_date, avg_score, conversations_summary")
      .order("test_date", { ascending: false })

    if (error) {
      console.error("[Queries] fetchTestRuns:", error)
      throw error
    }

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

      const score = row.avg_score
      if (typeof score === "number") {
        if (score >= 8) testRun.distribution.success++
        else if (score >= 6) testRun.distribution.partial++
        else testRun.distribution.failure++
      }
    })

    return Array.from(testRunsMap.values()).map((run) => ({
      ...run,
      avgScore: (run.scores.reduce((a: number, b: number) => a + b, 0) / run.scores.length).toFixed(1),
    }))
  })
}

export async function fetchUniquePersonas(): Promise<PersonaSummary[]> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("personas_performance")
      .select("personaid, persona_description, persona_category")

    if (error) {
      console.error("[Queries] fetchUniquePersonas:", error)
      throw error
    }

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

export async function fetchUniqueCategories(): Promise<string[]> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from("personas_performance").select("persona_category")

    if (error) {
      console.error("[Queries] fetchUniqueCategories:", error)
      throw error
    }

    const categoriesSet = new Set<string>()
    data?.forEach((row: PersonaPerformanceRow) => {
      if (row.persona_category) categoriesSet.add(row.persona_category)
    })

    return Array.from(categoriesSet).sort()
  })
}

export async function fetchHeatmapData(): Promise<HeatmapRow[]> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("personas_performance")
      .select("personaid, persona_description, all_criteria_details")

    if (error) {
      console.error("[Queries] fetchHeatmapData:", error)
      throw error
    }

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
      return { persona: personaData.persona, ...scores }
    })
  })
}

export async function updateConversationNotes(conversationId: number, notes: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabase()
    const { error: updateError } = await supabase
      .from("old_conversations")
      .update({ human_notes: notes })
      .eq("conversationid", conversationId)

    if (updateError) {
      console.error("[Queries] updateConversationNotes:", updateError)
      throw updateError
    }
  })
}
