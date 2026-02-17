/**
 * Supabase client configuration
 * Uses browser client for client-side rendering
 * Singleton pattern to avoid multiple connections
 */
import { createBrowserClient } from "@supabase/ssr"

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase] Missing environment variables:", {
      url: supabaseUrl ? "SET" : "MISSING",
      key: supabaseAnonKey ? "SET" : "MISSING",
    })
    return createBrowserClient(supabaseUrl || "", supabaseAnonKey || "")
  }

  if (supabaseInstance) return supabaseInstance

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

export type PersonaPerformanceRow = {
  conversationid: string
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
    conversation_id: string
  }>
  conversations_summary: Array<{
    conversationid: string
    outcome: "success" | "partial" | "failure"
    score: number
    summary: string
    human_notes: string
    turns: number
    appointment_booked?: boolean
  }>
  conversations_transcripts: string
}
