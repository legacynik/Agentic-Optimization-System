/**
 * Safely parses conversations_summary from Supabase which can be
 * a JSON string, an already-parsed array, or null/undefined.
 */
export function parseConversationsSummary(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "[]")
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}
