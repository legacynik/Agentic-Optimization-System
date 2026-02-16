"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useConversationsQuery, usePersonasQuery, useCategoriesQuery } from "@/hooks/queries"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { exportConversationsToCSV, exportCriteriaToCSV } from "@/lib/export-csv"
import { exportConversationsToPDF, exportCriteriaToPDF } from "@/lib/export-pdf"
import { exportConversationsToJSON, exportCriteriaToJSON } from "@/lib/export-json"
import { getConversationSummary, buildCriteriaMatrix } from "./helpers"

interface FilterState {
  searchQuery: string
  selectedOutcomes: string[]
  selectedCategories: string[]
  selectedPersonas: string[]
  selectedTestRuns: string[]
  scoreRange: number[]
  turnsRange: number[]
}

export function useConversationData(selectedConversations: string[]) {
  const { data: conversations = [], isLoading: convLoading, error: convError } = useConversationsQuery()
  const { data: personas = [], isLoading: pLoading } = usePersonasQuery()
  const { data: categories = [], isLoading: cLoading } = useCategoriesQuery()

  const loading = convLoading || pLoading || cLoading
  const error = convError ? (convError instanceof Error ? convError.message : "Failed to load data") : null

  const [selectedConversation, setSelectedConversation] = useState<PersonaPerformanceRow | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedOutcomes: [],
    selectedCategories: [],
    selectedPersonas: [],
    selectedTestRuns: [],
    scoreRange: [0, 10],
    turnsRange: [0, 20],
  })

  // Auto-select first conversation when data loads
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0])
    }
  }, [conversations, selectedConversation])

  const testRuns = useMemo(() => {
    return Array.from(new Set(conversations.filter(c => c.testrunid).map(c => c.testrunid))).sort()
  }, [conversations])

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const summary = getConversationSummary(conv)
      const score = Number.parseFloat(String(conv.avg_score))
      const turns = Math.round(Number.parseFloat(String(conv.avg_turns)))
      const { searchQuery, selectedOutcomes, selectedCategories, selectedPersonas, selectedTestRuns, scoreRange, turnsRange } = filters

      const matchesSearch = searchQuery === "" ||
        conv.conversations_transcripts.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.summary?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch &&
        (selectedOutcomes.length === 0 || selectedOutcomes.includes(summary.outcome?.toLowerCase())) &&
        (selectedCategories.length === 0 || selectedCategories.includes(conv.persona_category)) &&
        (selectedCategories.length > 0 || selectedPersonas.length === 0 || selectedPersonas.includes(conv.personaid)) &&
        (selectedTestRuns.length === 0 || selectedTestRuns.includes(conv.testrunid)) &&
        score >= scoreRange[0] && score <= scoreRange[1] &&
        turns >= turnsRange[0] && turns <= turnsRange[1]
    })
  }, [conversations, filters])

  const filteredPersonas = useMemo(() => {
    return filters.selectedCategories.length > 0
      ? personas.filter((p) => filters.selectedCategories.includes(p.category))
      : personas
  }, [personas, filters.selectedCategories])

  const selectedConvsData = useMemo(() => {
    return conversations.filter((c) => selectedConversations.includes(String(c.conversationid)))
  }, [conversations, selectedConversations])

  const exportHandlers = useMemo(() => {
    const compareExport = (fn: (convs: PersonaPerformanceRow[], matrix: ReturnType<typeof buildCriteriaMatrix>) => void) => () => {
      if (selectedConvsData.length >= 2) {
        fn(selectedConvsData, buildCriteriaMatrix(selectedConvsData))
      }
    }
    return {
      csv: () => exportConversationsToCSV(filteredConversations),
      pdf: () => exportConversationsToPDF(filteredConversations),
      json: () => exportConversationsToJSON(filteredConversations),
      compareCSV: compareExport(exportCriteriaToCSV),
      comparePDF: compareExport(exportCriteriaToPDF),
      compareJSON: compareExport(exportCriteriaToJSON),
    }
  }, [filteredConversations, selectedConvsData])

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    conversations, loading, error,
    selectedConversation, setSelectedConversation,
    filters, updateFilter,
    categories, filteredPersonas, testRuns,
    filteredConversations, exportHandlers,
  }
}
