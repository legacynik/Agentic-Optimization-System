"use client"

import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { useState } from "react"

interface ConversationTranscriptProps {
  transcript: string
}

export function ConversationTranscript({ transcript }: ConversationTranscriptProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!transcript || typeof transcript !== "string") {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/10">
        <p className="text-sm text-muted-foreground">No transcript available for this conversation.</p>
      </div>
    )
  }

  const turns = transcript
    .split("\n\n")
    .filter((t) => t.trim())
    .map((turn, index) => {
      const colonIndex = turn.indexOf(":")
      if (colonIndex === -1) {
        return { speaker: "Unknown", message: turn, index, isAgent: false }
      }

      const speaker = turn.substring(0, colonIndex).trim()
      const message = turn.substring(colonIndex + 1).trim()

      return {
        speaker,
        message,
        index,
        isAgent: speaker === "Agent",
      }
    })

  if (turns.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/10">
        <p className="text-sm text-muted-foreground">Transcript is empty.</p>
      </div>
    )
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-background via-background to-muted/10">
      {turns.map((turn) => (
        <div key={turn.index} className={`flex ${turn.isAgent ? "justify-start" : "justify-end"} group`}>
          <div className={`max-w-[80%] ${turn.isAgent ? "mr-auto" : "ml-auto"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {turn.speaker} • Turn {turn.index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(turn.message, turn.index)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              {copiedIndex === turn.index && <span className="text-xs text-secondary">Copied!</span>}
            </div>
            <div
              className={`rounded-lg px-4 py-3 shadow-sm ${
                turn.isAgent
                  ? "bg-gradient-to-br from-card to-card/80 border border-border text-foreground"
                  : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
