/**
 * Supabase client configuration
 * Uses browser client for client-side rendering
 * Singleton pattern to avoid multiple connections
 */
import { createBrowserClient } from "@supabase/ssr"

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Gets the Supabase client singleton
 * Creates new instance only on first call
 */
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[Supabase] getSupabase called", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    hasInstance: !!supabaseInstance
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase] Missing environment variables!")
    console.error("[Supabase] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING")
    console.error("[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "SET" : "MISSING")
    // Return a client anyway - will fail on query but won't hang
    return createBrowserClient(supabaseUrl || "", supabaseAnonKey || "")
  }

  if (supabaseInstance) {
    console.log("[Supabase] Returning existing instance")
    return supabaseInstance
  }

  console.log("[Supabase] Creating new client...")
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  console.log("[Supabase] Client created successfully")

  return supabaseInstance
}

export type PersonaPerformanceRow = {
  conversationid: number
  personaid: string
  persona_description: string
  persona_category: string
  testrunid: string
  promptversionid: string
  agentversion: string
  testrun_notes: string
  avg_score: number
  avg_turns: number
  test_date: string
  all_criteria_details: Array<{
    criteria_name: string
    score: number
    conversation_id: number
  }>
  conversations_summary: Array<{
    conversationid: number
    outcome: "success" | "partial" | "failure"
    score: number
    summary: string
    human_notes: string
    turns: number
    appointment_booked?: boolean
  }>
  conversations_transcripts: string
}
