import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface LatestConversationsCardProps {
  conversations: PersonaPerformanceRow[]
}

export function LatestConversationsCard({ conversations }: LatestConversationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Conversations</CardTitle>
        <CardDescription>Most recent test conversations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversations.slice(0, 5).map((conv) => {
          const firstConv = Array.isArray(conv.conversations_summary) ? conv.conversations_summary[0] : null
          const score = conv.avg_score
          const outcome = score >= 8 ? "success" : score >= 6 ? "partial" : "failure"

          return (
            <div key={conv.conversationid} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate max-w-[200px]">{conv.persona_description}</p>
                <Badge
                  variant={outcome === "success" ? "default" : outcome === "partial" ? "secondary" : "destructive"}
                >
                  {conv.avg_score?.toFixed(1) ?? "—"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {firstConv?.summary || "No summary available"}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {conv.avg_turns} turns
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {conv.agentversion}
                </Badge>
              </div>
            </div>
          )
        })}
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No conversations found</p>
        )}
      </CardContent>
    </Card>
  )
}
