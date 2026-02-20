import { NextRequest } from "next/server"
import { apiSuccess, apiError, createSupabaseClient } from "@/lib/api-response"

const supabase = createSupabaseClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; otherId: string }> }
) {
  const { id: evaluationId1, otherId: evaluationId2 } = await params

  try {
    // Fetch both evaluations with their battle_evaluations
    const evalSelect = `
        id,
        test_run_id,
        evaluator_config:evaluator_configs(name, version),
        overall_score,
        success_count,
        failure_count,
        partial_count,
        model_used,
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

    const { data: eval1Data, error: eval1Error } = await supabase
      .from("evaluations")
      .select(evalSelect)
      .eq("id", evaluationId1)
      .single()

    const { data: eval2Data, error: eval2Error } = await supabase
      .from("evaluations")
      .select(evalSelect)
      .eq("id", evaluationId2)
      .single()

    if (eval1Error || !eval1Data) {
      return apiError("First evaluation not found", "NOT_FOUND", 404)
    }

    if (eval2Error || !eval2Data) {
      return apiError("Second evaluation not found", "NOT_FOUND", 404)
    }

    // Verify both evaluations are from the same test_run
    if (eval1Data.test_run_id !== eval2Data.test_run_id) {
      return apiError(
        "Cannot compare evaluations from different test runs",
        "INVALID_COMPARISON",
        400
      )
    }

    // Calculate criteria averages for each evaluation
    const eval1CriteriaAvg = calculateCriteriaAverages(
      eval1Data.battle_evaluations || []
    )
    const eval2CriteriaAvg = calculateCriteriaAverages(
      eval2Data.battle_evaluations || []
    )

    // Calculate deltas
    const criteriaDeltas = calculateCriteriaDeltas(
      eval1CriteriaAvg,
      eval2CriteriaAvg
    )

    const totalBattles1 =
      (eval1Data.success_count || 0) +
      (eval1Data.failure_count || 0) +
      (eval1Data.partial_count || 0)
    const totalBattles2 =
      (eval2Data.success_count || 0) +
      (eval2Data.failure_count || 0) +
      (eval2Data.partial_count || 0)

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

    // Calculate per-persona breakdown
    const perPersona = calculatePerPersonaComparison(
      eval1Data.battle_evaluations || [],
      eval2Data.battle_evaluations || []
    )

    // Determine verdict
    const improvements = criteriaDeltas.filter((c) => c.direction === "up").length
    const regressions = criteriaDeltas.filter((c) => c.direction === "down").length
    const unchanged = criteriaDeltas.filter((c) => c.direction === "same").length

    let betterEvaluation: "a" | "b" | "tie" = "tie"
    if (scoreDelta > 0.1) betterEvaluation = "b"
    else if (scoreDelta < -0.1) betterEvaluation = "a"

    // Build criteria snapshot diff (T4)
    const snapshotA = (eval1Data as any).criteria_snapshot
    const snapshotB = (eval2Data as any).criteria_snapshot
    const criteriaSnapshotDiff = buildSnapshotDiff(snapshotA, snapshotB)

    const comparisonData = {
      evaluation_a: {
        id: eval1Data.id,
        evaluator_name: (eval1Data.evaluator_config as any)?.name || "Unknown",
        evaluator_version: (eval1Data.evaluator_config as any)?.version || "1.0",
        overall_score: eval1Data.overall_score || 0,
        success_rate: successRate1,
        criteria_avg: eval1CriteriaAvg,
        model_used: (eval1Data as any).model_used || null,
        criteria_snapshot: snapshotA || null,
      },
      evaluation_b: {
        id: eval2Data.id,
        evaluator_name: (eval2Data.evaluator_config as any)?.name || "Unknown",
        evaluator_version: (eval2Data.evaluator_config as any)?.version || "1.0",
        overall_score: eval2Data.overall_score || 0,
        success_rate: successRate2,
        criteria_avg: eval2CriteriaAvg,
        model_used: (eval2Data as any).model_used || null,
        criteria_snapshot: snapshotB || null,
      },
      deltas: {
        overall_score: {
          value: scoreDelta,
          percent: scorePercent,
        },
        success_rate: {
          value: successRateDelta,
          percent: successRatePercent,
        },
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

    return apiSuccess(comparisonData)
  } catch (error) {
    console.error("[compare] Unexpected error:", error)
    return apiError("Internal server error", "INTERNAL_ERROR", 500)
  }
}

function calculateCriteriaAverages(
  battleEvaluations: any[]
): Record<string, number> {
  const criteriaSums: Record<string, number[]> = {}

  for (const battle of battleEvaluations) {
    const scores = battle.criteria_scores || {}
    for (const [criterionName, score] of Object.entries(scores)) {
      if (typeof score === "number") {
        if (!criteriaSums[criterionName]) {
          criteriaSums[criterionName] = []
        }
        criteriaSums[criterionName].push(score)
      }
    }
  }

  const averages: Record<string, number> = {}
  for (const [criterionName, scores] of Object.entries(criteriaSums)) {
    if (scores.length > 0) {
      averages[criterionName] =
        scores.reduce((sum, s) => sum + s, 0) / scores.length
    }
  }

  return averages
}

function calculateCriteriaDeltas(
  avg1: Record<string, number>,
  avg2: Record<string, number>
): Array<{
  name: string
  a: number
  b: number
  delta: number
  direction: "up" | "down" | "same"
}> {
  const allCriteria = new Set([...Object.keys(avg1), ...Object.keys(avg2)])
  const deltas = []

  for (const criterion of allCriteria) {
    const a = avg1[criterion] || 0
    const b = avg2[criterion] || 0
    const delta = b - a

    let direction: "up" | "down" | "same" = "same"
    if (Math.abs(delta) > 0.1) {
      direction = delta > 0 ? "up" : "down"
    }

    deltas.push({
      name: criterion,
      a,
      b,
      delta,
      direction,
    })
  }

  return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/**
 * Compares two criteria snapshots and returns a diff of what changed.
 * Works with the new taxonomy format: { core: string[], domain: string[], weights: Record<string, number> }
 */
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
    if (Math.abs(wA - wB) > 0.01) {
      weightChanges.push({ name: key, a: wA, b: wB })
    }
  }

  const sameConfig = added.length === 0 && removed.length === 0 && weightChanges.length === 0

  return {
    same_config: sameConfig,
    added_criteria: added,
    removed_criteria: removed,
    weight_changes: weightChanges,
  }
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
  criteria_deltas: Array<{
    name: string
    a: number
    b: number
    delta: number
  }>
}> {
  // Group battles by persona
  const personaMap: Map<
    string,
    {
      name: string
      battles1: any[]
      battles2: any[]
    }
  > = new Map()

  for (const battle of battles1) {
    const personaId = battle.battle_result?.persona_id
    const personaName = battle.battle_result?.personas?.name || "Unknown"
    if (personaId) {
      if (!personaMap.has(personaId)) {
        personaMap.set(personaId, { name: personaName, battles1: [], battles2: [] })
      }
      personaMap.get(personaId)!.battles1.push(battle)
    }
  }

  for (const battle of battles2) {
    const personaId = battle.battle_result?.persona_id
    const personaName = battle.battle_result?.personas?.name || "Unknown"
    if (personaId) {
      if (!personaMap.has(personaId)) {
        personaMap.set(personaId, { name: personaName, battles1: [], battles2: [] })
      }
      personaMap.get(personaId)!.battles2.push(battle)
    }
  }

  const perPersona = []

  for (const [personaId, data] of personaMap.entries()) {
    const scoreA =
      data.battles1.length > 0
        ? data.battles1.reduce((sum, b) => sum + (b.score || 0), 0) /
          data.battles1.length
        : 0

    const scoreB =
      data.battles2.length > 0
        ? data.battles2.reduce((sum, b) => sum + (b.score || 0), 0) /
          data.battles2.length
        : 0

    const criteriaAvgA = calculateCriteriaAverages(data.battles1)
    const criteriaAvgB = calculateCriteriaAverages(data.battles2)

    const criteriaDeltas = []
    const allCriteria = new Set([
      ...Object.keys(criteriaAvgA),
      ...Object.keys(criteriaAvgB),
    ])

    for (const criterion of allCriteria) {
      const a = criteriaAvgA[criterion] || 0
      const b = criteriaAvgB[criterion] || 0
      criteriaDeltas.push({
        name: criterion,
        a,
        b,
        delta: b - a,
      })
    }

    perPersona.push({
      persona_id: personaId,
      persona_name: data.name,
      score_a: scoreA,
      score_b: scoreB,
      delta: scoreB - scoreA,
      criteria_deltas,
    })
  }

  return perPersona.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}
