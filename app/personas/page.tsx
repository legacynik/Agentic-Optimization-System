'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PersonaWorkshop } from '@/components/version-centric/persona-workshop'
import { getSupabase } from '@/lib/supabase'

interface PromptVersion {
  id: string
  prompt_name: string
  version: string
}

export default function PersonasPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null)

  useEffect(() => {
    getSupabase()
      .from('prompt_versions')
      .select('id, prompt_name, version')
      .order('prompt_name')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setVersions(data)
      })
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Personas</h1>
        <Select
          value={selectedVersion?.id || 'all'}
          onValueChange={(val) => {
            if (val === 'all') setSelectedVersion(null)
            else setSelectedVersion(versions.find(p => p.id === val) || null)
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by prompt..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {versions.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.prompt_name} {p.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PersonaWorkshop
        promptName={selectedVersion?.prompt_name || ''}
        promptVersion={selectedVersion?.version || ''}
        promptVersionId={selectedVersion?.id}
      />
    </div>
  )
}
