/**
 * AgentSelector Component
 *
 * Dropdown to select an agent (prompt_name) from available prompt versions.
 * Fetches distinct prompt names from /api/prompts/names endpoint.
 *
 * @module components/agentic/agent-selector
 */

'use client'

import { useEffect, useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AgentSelectorProps {
  /** Currently selected agent name */
  value: string | null
  /** Callback when agent selection changes */
  onChange: (agentName: string) => void
  /** Optional className for the container */
  className?: string
}

/**
 * AgentSelector - Dropdown for selecting an agent by prompt_name
 *
 * Fetches available agent names on mount and displays them in a select dropdown.
 * Shows loading state while fetching and handles errors gracefully.
 */
export function AgentSelector({ value, onChange, className }: AgentSelectorProps) {
  const [agents, setAgents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch agent names on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        const response = await fetch('/api/prompts/names')

        if (!response.ok) {
          throw new Error('Failed to fetch agents')
        }

        const data = await response.json()
        setAgents(data.names || [])

        // Auto-select first agent if none selected and agents exist
        if (!value && data.names?.length > 0) {
          onChange(data.names[0])
        }
      } catch (err) {
        console.error('[AgentSelector] Error fetching agents:', err)
        setError('Failed to load agents')
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Bot className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Agent:</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Bot className="h-5 w-5 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
      </div>
    )
  }

  // No agents available
  if (agents.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Bot className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No agents configured</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Bot className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Agent:</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select agent" />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent} value={agent}>
              {agent}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
