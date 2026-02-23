"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy } from "lucide-react"
import { useState, useMemo } from "react"

// NOTE: This component has no active callers — conversations-v2.tsx handles
// transcript rendering directly via its own StructuredTranscriptView. This file
// is kept as a shared utility module; getLatencyVariant is exported and imported
// by conversations-v2.tsx to avoid duplicating the threshold logic.

// ============================================================================
// Types
// ============================================================================

interface StructuredTurn {
  speaker: string
  message: string
  timestamp_ms: number | null
}

interface StructuredTranscript {
  turns: StructuredTurn[]
}

interface ConversationTranscriptProps {
  transcript: string
  transcriptStructured?: StructuredTranscript | null
  loading?: boolean
  error?: string
}

/** Parsed turn with computed latency for rendering */
interface ParsedTurn {
  speaker: string
  message: string
  index: number
  isAgent: boolean
  /** Latency in ms from previous turn (only for agent turns with structured data) */
  latencyMs: number | null
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute latency badge variant based on response time thresholds.
 * Exported so conversations-v2.tsx can reuse without duplicating logic.
 */
export function getLatencyVariant(latencyMs: number): "secondary" | "outline" | "destructive" {
  if (latencyMs > 10000) return "destructive"
  if (latencyMs > 5000) return "outline"
  return "secondary"
}

/** Parse structured transcript into turns with latency */
function parseStructuredTurns(structured: StructuredTranscript): ParsedTurn[] {
  return structured.turns.map((turn, index) => {
    let latencyMs: number | null = null
    const isAgent = turn.speaker === "Agent" || turn.speaker === "assistant"

    if (isAgent && index > 0) {
      const prevTimestamp = structured.turns[index - 1].timestamp_ms
      if (prevTimestamp && turn.timestamp_ms) {
        latencyMs = turn.timestamp_ms - prevTimestamp
      }
    }

    return {
      speaker: turn.speaker,
      message: turn.message,
      index,
      isAgent,
      latencyMs,
    }
  })
}

/** Parse plain text transcript (legacy "Speaker: message\n\n" format) */
function parsePlainTextTurns(transcript: string): ParsedTurn[] {
  return transcript
    .split("\n\n")
    .filter((t) => t.trim())
    .map((turn, index) => {
      const colonIndex = turn.indexOf(":")
      if (colonIndex === -1) {
        return { speaker: "Unknown", message: turn, index, isAgent: false, latencyMs: null }
      }

      const speaker = turn.substring(0, colonIndex).trim()
      const message = turn.substring(colonIndex + 1).trim()

      return {
        speaker,
        message,
        index,
        isAgent: speaker === "Agent",
        latencyMs: null,
      }
    })
}

// ============================================================================
// Component
// ============================================================================

export function ConversationTranscript({
  transcript,
  transcriptStructured,
  loading = false,
  error,
}: ConversationTranscriptProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Determine whether to use structured or plain text parsing
  const hasStructuredData = Boolean(
    transcriptStructured?.turns?.length && transcriptStructured.turns.length > 0
  )

  const turns = useMemo<ParsedTurn[] | null>(() => {
    try {
      if (hasStructuredData && transcriptStructured) {
        return parseStructuredTurns(transcriptStructured)
      }
      if (transcript && typeof transcript === "string") {
        return parsePlainTextTurns(transcript)
      }
      return null
    } catch (parseError) {
      console.error("[ConversationTranscript] Error parsing transcript:", parseError)
      return null
    }
  }, [transcript, transcriptStructured, hasStructuredData])

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-background via-background to-muted/10">
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-[80px] w-[300px]" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-[100px] ml-auto" />
            <Skeleton className="h-[60px] w-[250px]" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-[100px] w-[320px]" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-[100px] ml-auto" />
            <Skeleton className="h-[70px] w-[280px]" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error Loading Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transcript && !hasStructuredData) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/10">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No transcript available for this conversation.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!turns || turns.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/10">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Transcript is empty.
          </CardContent>
        </Card>
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
                {turn.speaker} &bull; Turn {turn.index + 1}
              </span>
              {turn.isAgent && turn.latencyMs !== null && turn.latencyMs >= 0 && (
                <Badge
                  variant={getLatencyVariant(turn.latencyMs)}
                  className={
                    turn.latencyMs > 5000 && turn.latencyMs <= 10000
                      ? "border-yellow-500 text-yellow-600"
                      : ""
                  }
                >
                  {(turn.latencyMs / 1000).toFixed(1)}s
                </Badge>
              )}
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
