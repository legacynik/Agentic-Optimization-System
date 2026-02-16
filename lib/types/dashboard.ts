export interface TestRunSummary {
  id: string
  date: string
  scores: number[]
  distribution: { success: number; partial: number; failure: number }
  avgScore: string
}

export interface PersonaSummary {
  id: string
  name: string
  description: string
  category: string
}

export interface HeatmapRow {
  persona: string
  [criteriaName: string]: number | string
}
