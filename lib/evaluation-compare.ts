/**
 * Shared logic for evaluation comparison (same-run and cross-run).
 * Extracted to avoid duplication between the two compare API routes.
 */

import { createSupabaseClient } from "@/lib/api-response"

const EVAL_SELECT = `
  id,
  test_run_id,
  evaluator_config:evaluator_configs(name, version),
  overall_score,
  success_count,
  failure_count,
  partial_count,
  model_used,
  tokens_used,
  criteria_snapshot,
  llm_config_snapshot,
  battle_evaluations(
    battle_result_id,
    score,
    criteria_scores,
    outcome,
    battle_result:battle_results(persona_id, personas(id, name))
  )
`

interface FetchResult {
  data: any | null
  error: string | null
}

export async function fetchEvaluation(id: string): Promise<FetchResult> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("evaluations")
    .select(EVAL_SELECT)
    .eq("id", id)
    .single()

  if (error || !data) {
    return { data: null, error: `Evaluation ${id} not found` }
  }
  return { data, error: null }
}

/** Builds the full comparison response payload from two evaluation records */
export function buildComparisonData(eval1Data: any, eval2Data: any) {
  const eval1CriteriaAvg = calculateCriteriaAverages(eval1Data.battle_evaluations || [])
  const eval2CriteriaAvg = calculateCriteriaAverages(eval2Data.battle_evaluations || [])

  const criteriaDeltas = calculateCriteriaDeltas(eval1CriteriaAvg, eval2CriteriaAvg)

  const totalBattles1 =
    (eval1Data.success_count || 0) + (eval1Data.failure_count || 0) + (eval1Data.partial_count || 0)
  const totalBattles2 =
    (eval2Data.success_count || 0) + (eval2Data.failure_count || 0) + (eval2Data.partial_count || 0)

  const successRate1 = totalBattles1 > 0 ? (eval1Data.success_count || 0) / totalBattles1 : 0
  const successRate2 = totalBattles2 > 0 ? (eval2Data.success_count || 0) / totalBattles2 : 0

  const scoreDelta = (eval2Data.overall_score || 0) - (eval1Data.overall_score || 0)
  const scorePercent =
    eval1Data.overall_score && eval1Data.overall_score > 0
      ? (scoreDelta / eval1Data.overall_score) * 100
      : 0

  const successRateDelta = (successRate2 - successRate1) * 100
  const successRatePercent =
    successRate1 > 0 ? (successRateDelta / (successRate1 * 100)) * 100 : 0

  const perPersona = calculatePerPersonaComparison(
    eval1Data.battle_evaluations || [],
    eval2Data.battle_evaluations || []
  )

  const improvements = criteriaDeltas.filter((c) => c.direction === "up").length
  const regressions = criteriaDeltas.filter((c) => c.direction === "down").length
  const unchanged = criteriaDeltas.filter((c) => c.direction === "same").length

  let betterEvaluation: "a" | "b" | "tie" = "tie"
  if (scoreDelta > 0.1) betterEvaluation = "b"
  else if (scoreDelta < -0.1) betterEvaluation = "a"

  const snapshotA = eval1Data.criteria_snapshot
  const snapshotB = eval2Data.criteria_snapshot
  const criteriaSnapshotDiff = buildSnapshotDiff(snapshotA, snapshotB)

  const modelA = eval1Data.model_used || null
  const modelB = eval2Data.model_used || null
  const tokensA = eval1Data.tokens_used ?? null
  const tokensB = eval2Data.tokens_used ?? null

  return {
    evaluation_a: {
      id: eval1Data.id,
      evaluator_name: eval1Data.evaluator_config?.name || "Unknown",
      evaluator_version: eval1Data.evaluator_config?.version || "1.0",
      overall_score: eval1Data.overall_score || 0,
      success_rate: successRate1,
      criteria_avg: eval1CriteriaAvg,
      model_used: modelA,
      criteria_snapshot: snapshotA || null,
    },
    evaluation_b: {
      id: eval2Data.id,
      evaluator_name: eval2Data.evaluator_config?.name || "Unknown",
      evaluator_version: eval2Data.evaluator_config?.version || "1.0",
      overall_score: eval2Data.overall_score || 0,
      success_rate: successRate2,
      criteria_avg: eval2CriteriaAvg,
      model_used: modelB,
      criteria_snapshot: snapshotB || null,
    },
    model_comparison: {
      eval_a: { model_used: modelA, tokens_used: tokensA },
      eval_b: { model_used: modelB, tokens_used: tokensB },
      same_model: modelA === modelB,
    },
    deltas: {
      overall_score: { value: scoreDelta, percent: scorePercent },
      success_rate: { value: successRateDelta, percent: successRatePercent },
      criteria: criteriaDeltas,
    },
    criteria_snapshot_diff: criteriaSnapshotDiff,
    per_persona: perPersona,
    verdict: {
      better_evaluation: betterEvaluation,
      improvements,
      regressions,
      unchanged,
    },
  }
}

function calculateCriteriaAverages(battleEvaluations: any[]): Record<string, number> {
  const criteriaSums: Record<string, number[]> = {}

  for (const battle of battleEvaluations) {
    const scores = battle.criteria_scores || {}
    for (const [criterionName, score] of Object.entries(scores)) {
      if (typeof score === "number") {
        if (!criteriaSums[criterionName]) criteriaSums[criterionName] = []
        criteriaSums[criterionName].push(score)
      }
    }
  }

  const averages: Record<string, number> = {}
  for (const [criterionName, scores] of Object.entries(criteriaSums)) {
    if (scores.length > 0) {
      averages[criterionName] = scores.reduce((sum, s) => sum + s, 0) / scores.length
    }
  }
  return averages
}

function calculateCriteriaDeltas(
  avg1: Record<string, number>,
  avg2: Record<string, number>
): Array<{ name: string; a: number; b: number; delta: number; direction: "up" | "down" | "same" }> {
  const allCriteria = new Set([...Object.keys(avg1), ...Object.keys(avg2)])
  const deltas = []

  for (const criterion of allCriteria) {
    const a = avg1[criterion] || 0
    const b = avg2[criterion] || 0
    const delta = b - a
    let direction: "up" | "down" | "same" = "same"
    if (Math.abs(delta) > 0.1) direction = delta > 0 ? "up" : "down"
    deltas.push({ name: criterion, a, b, delta, direction })
  }

  return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

function buildSnapshotDiff(
  snapshotA: any,
  snapshotB: any
): {
  same_config: boolean
  added_criteria: string[]
  removed_criteria: string[]
  weight_changes: Array<{ name: string; a: number; b: number }>
} | null {
  if (!snapshotA || !snapshotB) return null

  const allCriteriaA = [...(snapshotA.core || []), ...(snapshotA.domain || [])]
  const allCriteriaB = [...(snapshotB.core || []), ...(snapshotB.domain || [])]

  const setA = new Set(allCriteriaA)
  const setB = new Set(allCriteriaB)

  const added = allCriteriaB.filter((c: string) => !setA.has(c))
  const removed = allCriteriaA.filter((c: string) => !setB.has(c))

  const weightsA = snapshotA.weights || {}
  const weightsB = snapshotB.weights || {}
  const allWeightKeys = new Set([...Object.keys(weightsA), ...Object.keys(weightsB)])

  const weightChanges: Array<{ name: string; a: number; b: number }> = []
  for (const key of allWeightKeys) {
    const wA = weightsA[key] ?? 1.0
    const wB = weightsB[key] ?? 1.0
    if (Math.abs(wA - wB) > 0.01) weightChanges.push({ name: key, a: wA, b: wB })
  }

  const sameConfig = added.length === 0 && removed.length === 0 && weightChanges.length === 0

  return { same_config: sameConfig, added_criteria: added, removed_criteria: removed, weight_changes: weightChanges }
}

function calculatePerPersonaComparison(
  battles1: any[],
  battles2: any[]
): Array<{
  persona_id: string
  persona_name: string
  score_a: number
  score_b: number
  delta: number
  criteria_deltas: Array<{ name: string; a: number; b: number; delta: number }>
}> {
  const personaMap: Map<string, { name: string; battles1: any[]; battles2: any[] }> = new Map()

  for (const battle of battles1) {
    const personaId = battle.battle_result?.persona_id
    const personaName = battle.battle_result?.personas?.name || "Unknown"
    if (personaId) {
      if (!personaMap.has(personaId)) personaMap.set(personaId, { name: personaName, battles1: [], battles2: [] })
      personaMap.get(personaId)!.battles1.push(battle)
    }
  }

  for (const battle of battles2) {
    const personaId = battle.battle_result?.persona_id
    const personaName = battle.battle_result?.personas?.name || "Unknown"
    if (personaId) {
      if (!personaMap.has(personaId)) personaMap.set(personaId, { name: personaName, battles1: [], battles2: [] })
      personaMap.get(personaId)!.battles2.push(battle)
    }
  }

  const perPersona = []

  for (const [personaId, data] of personaMap.entries()) {
    const scoreA =
      data.battles1.length > 0
        ? data.battles1.reduce((sum, b) => sum + (b.score || 0), 0) / data.battles1.length
        : 0
    const scoreB =
      data.battles2.length > 0
        ? data.battles2.reduce((sum, b) => sum + (b.score || 0), 0) / data.battles2.length
        : 0

    const criteriaAvgA = calculateCriteriaAverages(data.battles1)
    const criteriaAvgB = calculateCriteriaAverages(data.battles2)

    const criteriaDeltas = []
    const allCriteria = new Set([...Object.keys(criteriaAvgA), ...Object.keys(criteriaAvgB)])

    for (const criterion of allCriteria) {
      const a = criteriaAvgA[criterion] || 0
      const b = criteriaAvgB[criterion] || 0
      criteriaDeltas.push({ name: criterion, a, b, delta: b - a })
    }

    perPersona.push({
      persona_id: personaId,
      persona_name: data.name,
      score_a: scoreA,
      score_b: scoreB,
      delta: scoreB - scoreA,
      criteria_deltas: criteriaDeltas,
    })
  }

  return perPersona.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}
