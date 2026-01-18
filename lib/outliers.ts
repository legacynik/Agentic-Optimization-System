/**
 * Calculate outliers (P10 and P90 percentiles) from an array of scores
 */
export interface OutlierData {
  p10: number
  p90: number
}

export function calculateOutliers(scores: number[]): OutlierData {
  if (scores.length === 0) {
    return { p10: 0, p90: 10 }
  }

  const sorted = [...scores].sort((a, b) => a - b)
  const p10Index = Math.floor(sorted.length * 0.1)
  const p90Index = Math.floor(sorted.length * 0.9)

  return {
    p10: sorted[p10Index] || sorted[0] || 0,
    p90: sorted[p90Index] || sorted[sorted.length - 1] || 10,
  }
}
