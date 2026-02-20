/**
 * Cross-test-run evaluation comparison endpoint.
 * Same comparison logic as the single-run compare, but without the test_run_id constraint.
 * Enables comparing evaluations across different test runs (e.g., v2.0 eval vs v3.0 eval).
 *
 * GET /api/evaluations/cross-compare?eval_a=UUID&eval_b=UUID
 */
import { NextRequest } from "next/server"
import { apiSuccess, apiError } from "@/lib/api-response"
import { fetchEvaluation, buildComparisonData } from "@/lib/evaluation-compare"

export async function GET(request: NextRequest) {
  const evalAId = request.nextUrl.searchParams.get("eval_a")
  const evalBId = request.nextUrl.searchParams.get("eval_b")

  if (!evalAId || !evalBId) {
    return apiError(
      "Both eval_a and eval_b query parameters are required",
      "MISSING_PARAMS",
      400
    )
  }

  if (evalAId === evalBId) {
    return apiError(
      "Cannot compare an evaluation with itself",
      "INVALID_COMPARISON",
      400
    )
  }

  try {
    const eval1 = await fetchEvaluation(evalAId)
    if (eval1.error || !eval1.data) {
      return apiError("Evaluation A not found", "NOT_FOUND", 404)
    }

    const eval2 = await fetchEvaluation(evalBId)
    if (eval2.error || !eval2.data) {
      return apiError("Evaluation B not found", "NOT_FOUND", 404)
    }

    const comparisonData = {
      ...buildComparisonData(eval1.data, eval2.data),
      cross_test_run: eval1.data.test_run_id !== eval2.data.test_run_id,
      test_run_a: eval1.data.test_run_id,
      test_run_b: eval2.data.test_run_id,
    }

    return apiSuccess(comparisonData)
  } catch (error) {
    console.error("[cross-compare] Unexpected error:", error)
    return apiError("Internal server error", "INTERNAL_ERROR", 500)
  }
}
