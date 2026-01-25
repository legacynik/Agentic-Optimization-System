/**
 * OptimizationPanel Component
 *
 * Panel for AI-suggested optimizations and human feedback.
 * Part of the Agent Health Monitor on /agentic page.
 *
 * Features:
 * - Checkbox list of AI suggestions from analysis_report
 * - Textarea for human feedback/suggestions
 * - Launch optimization button (triggers n8n workflow)
 *
 * Uses semantic colors per spec:
 * - high priority: rose
 * - medium priority: amber
 * - low priority: emerald
 * - primary: violet
 *
 * @module components/agentic/optimization-panel
 */

'use client'

import { useState, useEffect } from 'react'
import { Rocket, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/** Prompt suggestion from analysis_report */
export interface PromptSuggestion {
  id: string
  action: 'ADD' | 'MODIFY' | 'REMOVE'
  text: string
  priority: 'high' | 'medium' | 'low'
}

interface OptimizationPanelProps {
  /** Test run ID to optimize */
  testRunId: string | null
  /** Agent name for display */
  agentName?: string
  /** AI-generated suggestions from analysis_report */
  suggestions?: PromptSuggestion[]
  /** Callback when optimization is triggered */
  onOptimize?: (selectedSuggestions: string[], feedback: string) => Promise<void>
  /** Whether optimization is in progress */
  isOptimizing?: boolean
  /** Whether the panel is disabled */
  disabled?: boolean
  /** Optional className */
  className?: string
}

/**
 * Returns priority badge styling
 */
function getPriorityStyle(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'low':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
}

/**
 * OptimizationPanel - AI suggestions and human feedback for optimization
 *
 * Allows users to:
 * 1. Select AI-generated suggestions to apply
 * 2. Provide additional feedback/context
 * 3. Trigger optimization workflow via n8n
 */
export function OptimizationPanel({
  testRunId,
  agentName,
  suggestions = [],
  onOptimize,
  isOptimizing = false,
  disabled = false,
  className,
}: OptimizationPanelProps) {
  const [feedback, setFeedback] = useState('')
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pre-select high priority suggestions
  useEffect(() => {
    const highPriority = suggestions
      .filter(s => s.priority === 'high')
      .map(s => s.id)
    setSelectedSuggestions(new Set(highPriority))
  }, [suggestions])

  // Toggle suggestion selection
  const toggleSuggestion = (id: string) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSuggestions(newSelected)
  }

  // Handle optimization trigger
  const handleOptimize = async () => {
    if (!testRunId || !onOptimize) return

    setError(null)
    setSuccess(false)

    try {
      await onOptimize(Array.from(selectedSuggestions), feedback)
      setSuccess(true)
      setFeedback('') // Clear feedback on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger optimization')
    }
  }

  // Determine if button should be disabled
  const isDisabled = disabled || !testRunId || isOptimizing
  const hasSelections = selectedSuggestions.size > 0 || feedback.trim().length > 0

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          Guide Optimization
        </CardTitle>
        <CardDescription>
          {agentName
            ? `Select suggestions to apply and add your notes to improve ${agentName}.`
            : 'Select suggestions to apply and add your notes for optimization.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">AI Suggestions:</p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <label
                  key={suggestion.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                    selectedSuggestions.has(suggestion.id)
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={selectedSuggestions.has(suggestion.id)}
                    onCheckedChange={() => toggleSuggestion(suggestion.id)}
                    disabled={isOptimizing}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{suggestion.text}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        getPriorityStyle(suggestion.priority)
                      )}>
                        {suggestion.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.action}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Textarea */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Your Notes (optional):</p>
          <Textarea
            placeholder="Add context, specific instructions, or additional changes you want..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isOptimizing}
            className="min-h-[80px] resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-rose-100 dark:bg-rose-900/30 p-3 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            Optimization workflow triggered successfully. Check n8n for progress.
          </div>
        )}

        {/* No Test Run Warning */}
        {!testRunId && (
          <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-3 text-sm text-amber-600 dark:text-amber-400">
            No test run available. Run a test first to enable optimization.
          </div>
        )}

        {/* Optimize Button */}
        <Button
          onClick={handleOptimize}
          disabled={isDisabled || !hasSelections}
          className="w-full bg-violet-600 hover:bg-violet-700"
          size="lg"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating New Version...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Generate New Version
            </>
          )}
        </Button>

        {!hasSelections && testRunId && (
          <p className="text-xs text-center text-muted-foreground">
            Select at least one suggestion or add notes to enable optimization.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
