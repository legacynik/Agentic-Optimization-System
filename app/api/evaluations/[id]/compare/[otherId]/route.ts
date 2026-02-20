import { NextRequest } from "next/server"
import { apiSuccess, apiError } from "@/lib/api-response"
import { fetchEvaluation, buildComparisonData } from "@/lib/evaluation-compare"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; otherId: string }> }
) {
  const { id: evaluationId1, otherId: evaluationId2 } = await params

  try {
    const eval1 = await fetchEvaluation(evaluationId1)
    if (eval1.error || !eval1.data) {
      return apiError("First evaluation not found", "NOT_FOUND", 404)
    }

    const eval2 = await fetchEvaluation(evaluationId2)
    if (eval2.error || !eval2.data) {
      return apiError("Second evaluation not found", "NOT_FOUND", 404)
    }

    // Same-run compare: verify both evaluations are from the same test_run
    if (eval1.data.test_run_id !== eval2.data.test_run_id) {
      return apiError(
        "Cannot compare evaluations from different test runs. Use /api/evaluations/cross-compare instead.",
        "INVALID_COMPARISON",
        400
      )
    }

    const comparisonData = buildComparisonData(eval1.data, eval2.data)
    return apiSuccess(comparisonData)
  } catch (error) {
    console.error("[compare] Unexpected error:", error)
    return apiError("Internal server error", "INTERNAL_ERROR", 500)
  }
}
