import { NextRequest } from "next/server"
import { apiSuccess, apiError, createSupabaseClient } from "@/lib/api-response"

const supabase = createSupabaseClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const evaluationId = params.id

  try {
    // Get evaluation to extract test_run_id
    const { data: evaluation, error: fetchError } = await supabase
      .from("evaluations")
      .select("id, test_run_id, status")
      .eq("id", evaluationId)
      .single()

    if (fetchError || !evaluation) {
      return apiError("Evaluation not found", "NOT_FOUND", 404)
    }

    // Check if evaluation is completed
    if (evaluation.status !== "completed") {
      return apiError(
        "Can only promote completed evaluations",
        "INVALID_STATUS",
        400
      )
    }

    // Transaction: unpromote others for this test_run, promote this one
    // Step 1: Unpromote all evaluations for this test_run
    const { error: unpromoteError } = await supabase
      .from("evaluations")
      .update({ is_promoted: false })
      .eq("test_run_id", evaluation.test_run_id)
      .eq("is_promoted", true)

    if (unpromoteError) {
      console.error("[promote] Unpromote error:", unpromoteError)
      return apiError("Failed to unpromote existing evaluations", "INTERNAL_ERROR", 500)
    }

    // Step 2: Promote this evaluation
    const { data: promoted, error: promoteError } = await supabase
      .from("evaluations")
      .update({ is_promoted: true })
      .eq("id", evaluationId)
      .select()
      .single()

    if (promoteError || !promoted) {
      console.error("[promote] Promote error:", promoteError)
      return apiError("Failed to promote evaluation", "INTERNAL_ERROR", 500)
    }

    return apiSuccess(promoted)
  } catch (error) {
    console.error("[promote] Unexpected error:", error)
    return apiError("Internal server error", "INTERNAL_ERROR", 500)
  }
}
