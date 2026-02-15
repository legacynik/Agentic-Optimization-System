import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const evaluationId = params.id

  try {
    // Get evaluation to extract test_run_id
    const { data: evaluation, error: fetchError } = await supabase
      .from("evaluations")
      .select("id, test_run_id, status")
      .eq("id", evaluationId)
      .single()

    if (fetchError || !evaluation) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Evaluation not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      )
    }

    // Check if evaluation is completed
    if (evaluation.status !== "completed") {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Can only promote completed evaluations",
            code: "INVALID_STATUS",
          },
        },
        { status: 400 }
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
      return NextResponse.json(
        {
          data: null,
          error: { message: "Failed to unpromote existing evaluations" },
        },
        { status: 500 }
      )
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
      return NextResponse.json(
        {
          data: null,
          error: { message: "Failed to promote evaluation" },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: promoted,
      error: null,
    })
  } catch (error) {
    console.error("[promote] Unexpected error:", error)
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error" },
      },
      { status: 500 }
    )
  }
}
