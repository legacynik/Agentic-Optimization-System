"use client"

/**
 * ConversationsV2 - 3-panel conversations explorer
 *
 * Left:   Filters (test run selector, outcome buttons)
 * Middle: Paginated battle_results list
 * Right:  Transcript viewer for JSONB [{role, content}] format
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string
  test_run_id: string
  test_run_code: string
  persona_id: string
  persona_name: string
  persona_category: string
  outcome: string
  score: number | null
  turns: number
  transcript: unknown
  created_at: string
}

interface TestRunOption {
  id: string
  test_run_code: string
}

interface Pagination {
  total: number | null
  limit: number
  offset: number
  has_more: boolean
}

interface TranscriptMessage {
  role: string
  content: string
}

// ============================================================================
// Constants
// ============================================================================

const OUTCOME_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  failure: "destructive",
  timeout: "secondary",
  error: "destructive",
}

const OUTCOME_FILTERS = ["all", "success", "failure", "timeout"]
const PAGE_SIZE = 50

// ============================================================================
// Main Component
// ============================================================================

export function ConversationsV2() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [testRuns, setTestRuns] = useState<TestRunOption[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    has_more: false,
  })

  const [testRunFilter, setTestRunFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")

  // Load test runs for the filter dropdown once on mount
  useEffect(() => {
    fetch('/api/test-runs?limit=50&order=desc')
      .then(r => r.json())
      .then(result => {
        if (result.data) {
          setTestRuns(
            result.data.map((r: { id: string; test_run_code: string }) => ({
              id: r.id,
              test_run_code: r.test_run_code,
            }))
          )
        }
      })
      .catch(() => {
        // Non-fatal: filter dropdown stays empty
      })
  }, [])

  const fetchConversations = useCallback((offset: number) => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    if (testRunFilter !== 'all') params.set('test_run_id', testRunFilter)
    if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter)

    fetch(`/api/conversations?${params}`)
      .then(r => r.json())
      .then(result => {
        setConversations(result.data || [])
        if (result.pagination) setPagination(result.pagination)
        setSelected(null)
      })
      .catch(() => {
        setConversations([])
      })
      .finally(() => setLoading(false))
  }, [testRunFilter, outcomeFilter])

  // Re-fetch when filters change, always resetting to page 0
  useEffect(() => {
    fetchConversations(0)
  }, [fetchConversations])

  const handlePrevPage = () => {
    fetchConversations(Math.max(0, pagination.offset - pagination.limit))
  }

  const handleNextPage = () => {
    fetchConversations(pagination.offset + pagination.limit)
  }

  const displayStart = pagination.total === 0 ? 0 : pagination.offset + 1
  const displayEnd = Math.min(pagination.offset + pagination.limit, pagination.total || 0)

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 p-6">

      {/* Left: Filters */}
      <Card className="w-[240px] shrink-0">
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Test Run</label>
            <Select value={testRunFilter} onValueChange={setTestRunFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All runs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Runs</SelectItem>
                {testRuns.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.test_run_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
            <div className="flex flex-wrap gap-1">
              {OUTCOME_FILTERS.map(o => (
                <Button
                  key={o}
                  size="sm"
                  variant={outcomeFilter === o ? "default" : "outline"}
                  onClick={() => setOutcomeFilter(o)}
                  className="text-xs capitalize"
                >
                  {o === 'all' ? 'All' : o}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {pagination.total ?? 0} conversations
          </p>
        </CardContent>
      </Card>

      {/* Middle: Results List */}
      <Card className="flex-1 min-w-[300px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Conversations</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pagination.offset === 0}
                onClick={handlePrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {displayStart}-{displayEnd}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={!pagination.has_more}
                onClick={handleNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversations found</p>
            ) : (
              <div className="divide-y">
                {conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                      selected?.id === c.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{c.persona_name}</span>
                      <Badge
                        variant={OUTCOME_BADGE_VARIANT[c.outcome] || "outline"}
                        className="text-xs shrink-0 ml-2"
                      >
                        {c.outcome}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{c.test_run_code}</span>
                      <span>{c.turns} turns</span>
                      {c.score != null && <span>Score: {c.score.toFixed(1)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Transcript Viewer */}
      <Card className="flex-1 min-w-[350px]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {selected
              ? `${selected.persona_name} — ${selected.test_run_code}`
              : 'Select a conversation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            {selected ? (
              <TranscriptViewer transcript={selected.transcript} />
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Click a conversation to view transcript
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Transcript Viewer
// ============================================================================

function TranscriptViewer({ transcript }: { transcript: unknown }) {
  const messages = parseTranscript(transcript)

  if (!messages.length) {
    return (
      <p className="text-center text-muted-foreground py-8">No transcript available</p>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg p-3 text-sm",
            msg.role === 'user'
              ? "bg-primary/10 ml-8"
              : msg.role === 'assistant'
                ? "bg-muted mr-8"
                : "bg-yellow-500/10 text-center text-xs"
          )}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">{msg.role}</p>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function parseTranscript(transcript: unknown): TranscriptMessage[] {
  if (Array.isArray(transcript)) {
    return transcript as TranscriptMessage[]
  }
  if (typeof transcript === 'string') {
    try {
      const parsed = JSON.parse(transcript)
      if (Array.isArray(parsed)) return parsed as TranscriptMessage[]
      return [{ role: 'system', content: transcript }]
    } catch {
      return [{ role: 'system', content: transcript }]
    }
  }
  return []
}
