'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PersonaWorkshop } from '@/components/version-centric/persona-workshop'

interface PromptOption {
  id: string
  prompt_name: string
  version: string
}

export default function PersonasPage() {
  const [prompts, setPrompts] = useState<PromptOption[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptOption | null>(null)

  useEffect(() => {
    fetch('/api/prompts/names')
      .then(r => r.json())
      .then(result => {
        if (result.data) setPrompts(result.data)
      })
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Personas</h1>
        <Select
          value={selectedPrompt?.id || 'all'}
          onValueChange={(val) => {
            if (val === 'all') setSelectedPrompt(null)
            else setSelectedPrompt(prompts.find(p => p.id === val) || null)
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by prompt..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {prompts.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.prompt_name} v{p.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PersonaWorkshop
        promptName={selectedPrompt?.prompt_name || ''}
        promptVersion={selectedPrompt?.version || ''}
      />
    </div>
  )
}
