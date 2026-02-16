export const SCORE_THRESHOLDS = { excellent: 8, good: 6, poor: 4 } as const

export type ScoreLevel = "excellent" | "good" | "fair" | "poor"

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.excellent) return "excellent"
  if (score >= SCORE_THRESHOLDS.good) return "good"
  if (score >= SCORE_THRESHOLDS.poor) return "fair"
  return "poor"
}

export function getScoreTextColor(score: number): string {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 6) return "text-yellow-600 dark:text-yellow-400"
  if (score >= 4) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

export function getScoreBgGradient(score: number): string {
  if (score >= 8) return "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/50"
  if (score >= 6) return "bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/50"
  return "bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/50"
}

export function getProgressColor(score: number): string {
  if (score >= 8) return "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-500"
  if (score >= 6) return "[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-500"
  return "[&>div]:bg-red-600 dark:[&>div]:bg-red-500"
}

export function getHeatmapCellColor(score: number): string {
  if (score >= 8) return "bg-emerald-500 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]"
  if (score >= 6) return "bg-yellow-400 text-black font-bold"
  if (score >= 4) return "bg-orange-500 text-white font-semibold"
  return "bg-red-500 text-white font-bold"
}

export function getScoreBadgeColor(score: number | undefined): string {
  if (!score) return "bg-muted/30"
  if (score >= 8) return "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]"
  if (score >= 6) return "bg-yellow-400 text-black font-medium"
  if (score >= 4) return "bg-orange-500 text-white"
  return "bg-red-500 text-white"
}
