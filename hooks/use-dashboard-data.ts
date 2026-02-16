import { useState, useEffect } from "react"
import { fetchPersonasPerformance, fetchTestRuns, fetchUniquePersonas, fetchHeatmapData } from "@/lib/queries"
import type { PersonaPerformanceRow } from "@/lib/supabase"

export interface DashboardData {
  conversations: PersonaPerformanceRow[]
  testRuns: any[]
  personas: any[]
  heatmapData: any[]
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    conversations: [],
    testRuns: [],
    personas: [],
    heatmapData: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      console.log("[Dashboard] loadData: Starting...")

      try {
        setLoading(true)

        console.log("[Dashboard] loadData: Fetching all data in parallel...")
        const [conversationsData, testRunsData, personasData, heatmapDataResult] = await Promise.all([
          fetchPersonasPerformance(),
          fetchTestRuns(),
          fetchUniquePersonas(),
          fetchHeatmapData(),
        ])

        console.log("[Dashboard] loadData: All data fetched", {
          conversations: conversationsData?.length || 0,
          testRuns: testRunsData?.length || 0,
          personas: personasData?.length || 0,
          heatmap: heatmapDataResult?.length || 0
        })

        setData({
          conversations: conversationsData || [],
          testRuns: testRunsData || [],
          personas: personasData || [],
          heatmapData: heatmapDataResult || [],
        })
        setError(null)

        console.log("[Dashboard] loadData: State updated, loading complete")
      } catch (err) {
        console.error("[Dashboard] loadData: Error occurred", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        console.log("[Dashboard] loadData: Setting loading=false")
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return { data, loading, error }
}
