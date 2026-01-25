/**
 * N8NStatusBar Component
 *
 * Footer status bar showing n8n workflow connection status.
 * Fetches status from /api/settings endpoint.
 *
 * @module components/agentic/n8n-status-bar
 */

'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WorkflowConfig {
  workflow_type: string
  webhook_url: string | null
  is_active: boolean
  last_triggered_at: string | null
  last_success_at: string | null
  total_executions: number
}

interface N8NStatusBarProps {
  /** Optional className */
  className?: string
  /** Callback when "View Logs" is clicked */
  onViewLogs?: () => void
}

/**
 * Formats relative time (e.g., "2 min ago")
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

/**
 * N8NStatusBar - Connection status footer
 *
 * Displays:
 * - Connection status indicator (green/red dot)
 * - Last sync time
 * - View Logs button
 */
export function N8NStatusBar({ className, onViewLogs }: N8NStatusBarProps) {
  const [config, setConfig] = useState<WorkflowConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch n8n status
  async function fetchStatus() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/settings')

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()

      // Find test_runner workflow config
      // API returns { data: [...] } not { workflow_configs: [...] }
      const configs = data.data || data.workflow_configs || []
      const testRunnerConfig = configs.find(
        (c: WorkflowConfig) => c.workflow_type === 'test_runner'
      )

      setConfig(testRunnerConfig || null)
      setError(null)
    } catch (err) {
      console.error('[N8NStatusBar] Error fetching status:', err)
      setError('Failed to load n8n status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  // Determine connection status
  const isConnected = config?.is_active && config?.webhook_url
  const lastSync = config?.last_triggered_at

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-t bg-muted/30',
        className
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking n8n status...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-t bg-red-50 dark:bg-red-900/20',
        className
      )}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 border-t bg-muted/30',
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                N8N: Connected
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                N8N: Disconnected
              </span>
            </>
          )}
        </div>

        {/* Separator */}
        <span className="text-muted-foreground">|</span>

        {/* Last sync */}
        <span className="text-sm text-muted-foreground">
          Last sync: {formatRelativeTime(lastSync ?? null)}
        </span>

        {/* Execution count */}
        {config?.total_executions !== undefined && config.total_executions > 0 && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">
              {config.total_executions} executions
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStatus}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>

        {/* View Logs button */}
        {onViewLogs && (
          <Button variant="ghost" size="sm" onClick={onViewLogs}>
            <ExternalLink className="h-4 w-4 mr-1" />
            View Logs
          </Button>
        )}
      </div>
    </div>
  )
}
