/**
 * Agentic Testing Page - Agent Health Monitor
 *
 * Refactored from the original tabbed layout to a focused Agent Health Monitor.
 * This page answers the question: "How is my agent performing?"
 *
 * Features:
 * - Agent selector dropdown
 * - Health monitor with score, trend, and insights
 * - Agent details with issues, personas, and trend chart
 * - Optimization panel with feedback and trigger
 * - Real-time n8n status bar
 *
 * @module app/agentic/page
 */

'use client'

import { useState, Suspense } from 'react'
import { AgentSelector } from '@/components/agentic/agent-selector'
import { HealthMonitor } from '@/components/agentic/health-monitor'
import { AgentDetails } from '@/components/agentic/agent-details'
import { OptimizationPanel } from '@/components/agentic/optimization-panel'
import { N8NStatusBar } from '@/components/agentic/n8n-status-bar'
import { useAgentHealth } from '@/hooks/use-agent-health'
import { useAgentDetails } from '@/hooks/use-agent-details'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the page
 */
function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Main content component with agent health monitoring
 */
function AgentHealthContent() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Fetch health data
  const { data: health, isLoading, error } = useAgentHealth(selectedAgent)

  // Fetch detailed data (only when details are shown)
  const { data: details, isLoading: detailsLoading } = useAgentDetails(
    selectedAgent,
    showDetails
  )

  // Handle "See Details" button - toggle details panel
  const handleSeeDetails = () => {
    setShowDetails((prev) => !prev)
  }

  // Handle "View Full Report" - navigate to dashboard with filter
  const handleViewFullReport = () => {
    if (selectedAgent) {
      window.location.href = `/?prompt_name=${encodeURIComponent(selectedAgent)}`
    }
  }

  // Handle optimization trigger via n8n trigger endpoint
  const handleOptimize = async (selectedSuggestions: string[], feedback: string) => {
    if (!details?.latestTestRunId) {
      throw new Error('No test run available for optimization')
    }

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_type: 'optimizer',
          test_run_id: details.latestTestRunId,
          selected_suggestions: selectedSuggestions,
          human_feedback: feedback || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to trigger optimization')
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  // Handle n8n logs view - opens n8n dashboard on Railway
  const handleViewLogs = () => {
    window.open('https://primary-production-1d87.up.railway.app/', '_blank')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Agentic Testing</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and optimize your AI agent performance
          </p>
        </div>

        {/* Agent Selector */}
        <AgentSelector value={selectedAgent} onChange={setSelectedAgent} />

        {/* Health Monitor */}
        {selectedAgent ? (
          <>
            {/* Summary Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <HealthMonitor
                score={health?.currentScore ?? null}
                trend={health?.trend ?? null}
                scoreHistory={health?.scoreHistory ?? []}
                outcomes={health?.outcomes ?? null}
                insight={health?.insight ?? null}
                isLoading={isLoading}
                onSeeDetails={handleSeeDetails}
                onOptimize={() => setShowDetails(true)}
                goalScore={8.0}
              />

              {/* Quick Stats Card */}
              <Card>
                <CardContent className="py-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Test Runs
                      </p>
                      <p className="text-2xl font-bold">
                        {isLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto" />
                        ) : (
                          health?.testRunsCount ?? 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Latest Score
                      </p>
                      <p className="text-2xl font-bold">
                        {isLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto" />
                        ) : health?.currentScore !== null ? (
                          health.currentScore.toFixed(1)
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trend</p>
                      <p
                        className={`text-2xl font-bold ${
                          health?.trend && health.trend > 0
                            ? 'text-emerald-600'
                            : health?.trend && health.trend < 0
                              ? 'text-rose-600'
                              : ''
                        }`}
                      >
                        {isLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto" />
                        ) : health?.trend !== null ? (
                          `${health.trend > 0 ? '+' : ''}${health.trend.toFixed(1)}`
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details Section (collapsible) */}
            {showDetails && (
              <div className="grid gap-6 md:grid-cols-2">
                <AgentDetails
                  topIssues={details?.topIssues ?? []}
                  scoreHistory={health?.scoreHistory ?? []}
                  strugglingPersonas={details?.strugglingPersonas ?? []}
                  excellingPersonas={details?.excellingPersonas ?? []}
                  isLoading={detailsLoading}
                  onViewFullReport={handleViewFullReport}
                />

                <OptimizationPanel
                  testRunId={details?.latestTestRunId ?? null}
                  agentName={selectedAgent}
                  suggestions={details?.suggestions ?? []}
                  onOptimize={handleOptimize}
                  isOptimizing={isOptimizing}
                />
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Select an agent above to view health metrics
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-center text-destructive">
              Failed to load agent health data. Please try again.
            </CardContent>
          </Card>
        )}
      </div>

      {/* N8N Status Bar (footer) */}
      <N8NStatusBar onViewLogs={handleViewLogs} />
    </div>
  )
}

/**
 * Main page export wrapped in Suspense
 */
export default function AgenticPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AgentHealthContent />
    </Suspense>
  )
}
