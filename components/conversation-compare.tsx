"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, FileText, Table as TableIcon } from 'lucide-react'
import type { PersonaPerformanceRow } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ConversationCompareProps {
  conversations: PersonaPerformanceRow[]
}

// Helper to parse transcript
const parseTranscript = (transcript: string) => {
  try {
    const parsed = JSON.parse(transcript)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Helper to get criteria list
const getCriteriaList = (conv: PersonaPerformanceRow) => {
  try {
    if (Array.isArray(conv.all_criteria_details)) {
      return conv.all_criteria_details
    }
    const parsed = JSON.parse(conv.all_criteria_details || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ConversationCompare({ conversations }: ConversationCompareProps) {
  const [syncScroll, setSyncScroll] = useState(true)
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([])

  // Handle synchronized scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, index: number) => {
    if (!syncScroll) return

    const scrollTop = e.currentTarget.scrollTop
    scrollRefs.current.forEach((ref, i) => {
      if (i !== index && ref) {
        ref.scrollTop = scrollTop
      }
    })
  }

  // Calculate all unique criteria
  const allCriteria = Array.from(
    new Set(
      conversations.flatMap((conv) => getCriteriaList(conv).map((c: any) => c.criteria_name))
    )
  ).sort()

  // Build criteria matrix
  const criteriaMatrix = allCriteria.map((criteriaName) => {
    const scores: Record<string, number> = {}
    conversations.forEach((conv) => {
      const criteria = getCriteriaList(conv).find((c: any) => c.criteria_name === criteriaName)
      scores[String(conv.conversationid)] = criteria?.score ?? 0
    })
    return { criteriaName, scores }
  })

  // Highlight cells with differences > 2 points
  const getCellHighlight = (scores: Record<string, number>, currentScore: number) => {
    const allScores = Object.values(scores)
    const max = Math.max(...allScores)
    const min = Math.min(...allScores)

    if (max - min < 2) return '' // No significant difference

    if (currentScore === max) return 'bg-green-100 dark:bg-green-900/30 font-bold'
    if (currentScore === min) return 'bg-red-100 dark:bg-red-900/30 font-bold'
    return ''
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Criteria', ...conversations.map((c) => `Conv ${c.conversationid}`)]
    const rows = criteriaMatrix.map((row) => [
      row.criteriaName,
      ...conversations.map((c) => row.scores[String(c.conversationid)]),
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comparison-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (conversations.length < 2) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select at least 2 conversations to compare</p>
      </div>
    )
  }

  if (conversations.length > 4) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Maximum 4 conversations can be compared</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Comparing {conversations.length} Conversations
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="sync-scroll" checked={syncScroll} onCheckedChange={setSyncScroll} />
            <Label htmlFor="sync-scroll">Sync Scroll</Label>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <TableIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Side-by-side transcripts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {conversations.map((conv, index) => {
          const transcript = parseTranscript(conv.conversations_transcripts)
          return (
            <Card key={conv.conversationid} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Conv {conv.conversationid}</span>
                  <Badge>{conv.avg_score.toFixed(1)}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">{conv.personaid}</p>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea
                  className="h-[400px] px-4"
                  ref={(el) => {
                    scrollRefs.current[index] = el?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
                  }}
                  onScroll={(e: any) => handleScroll(e, index)}
                >
                  <div className="space-y-3 pb-4">
                    {transcript.map((turn: any, turnIndex: number) => (
                      <div
                        key={turnIndex}
                        className={cn(
                          'rounded-lg p-2 text-sm',
                          turn.role === 'user'
                            ? 'bg-blue-100 dark:bg-blue-900/30 ml-8'
                            : 'bg-gray-100 dark:bg-gray-800 mr-8'
                        )}
                      >
                        <p className="font-semibold text-xs mb-1">
                          {turn.role === 'user' ? 'User' : 'Agent'}
                        </p>
                        <p>{turn.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Criteria comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>Criteria Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Criteria</TableHead>
                {conversations.map((conv) => (
                  <TableHead key={conv.conversationid} className="text-center">
                    Conv {conv.conversationid}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteriaMatrix.map((row) => (
                <TableRow key={row.criteriaName}>
                  <TableCell className="font-medium">{row.criteriaName}</TableCell>
                  {conversations.map((conv) => {
                    const score = row.scores[String(conv.conversationid)]
                    const highlight = getCellHighlight(row.scores, score)
                    return (
                      <TableCell
                        key={conv.conversationid}
                        className={cn('text-center', highlight)}
                      >
                        {score.toFixed(1)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              {/* Average row */}
              <TableRow className="font-bold bg-muted">
                <TableCell>Average</TableCell>
                {conversations.map((conv) => (
                  <TableCell key={conv.conversationid} className="text-center">
                    {conv.avg_score.toFixed(1)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
