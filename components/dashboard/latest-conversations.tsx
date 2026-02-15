"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PersonaPerformanceRow } from "@/lib/supabase"

interface LatestConversationsProps {
  conversations: PersonaPerformanceRow[]
  maxItems?: number
}

export function LatestConversations({
  conversations,
  maxItems = 3,
}: LatestConversationsProps) {
  const displayedConversations = conversations.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Latest Conversations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedConversations.map((conv) => {
          const firstConv = Array.isArray(conv.conversations_summary)
            ? conv.conversations_summary[0]
            : null
          const score = conv.avg_score
          const outcome =
            score >= 8 ? "success" : score >= 6 ? "partial" : "failure"

          return (
            <Card key={conv.conversationid} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {conv.conversationid}
                  </span>
                  <Badge
                    variant={
                      outcome === "success"
                        ? "default"
                        : outcome === "partial"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {conv.avg_score}
                  </Badge>
                </div>
                <p className="text-sm text-foreground font-medium mb-1">
                  {conv.persona_description}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {firstConv?.summary || "No summary"}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {conv.personaid}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {conv.avg_turns} turns
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {conv.agentversion}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}
