"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useDashboardStore } from "@/stores/dashboard-store"
import { ConversationFilterPanel } from "@/components/conversations/conversation-filter-panel"
import { ConversationListPanel } from "@/components/conversations/conversation-list-panel"
import { ConversationDetailPanel } from "@/components/conversations/conversation-detail-panel"
import { useConversationData } from "@/components/conversations/use-conversation-data"

export function ConversationExplorer() {
  const { selectedConversations, toggleConversationSelection } = useDashboardStore()
  const {
    conversations, loading, error,
    selectedConversation, setSelectedConversation,
    filters, updateFilter,
    categories, filteredPersonas, testRuns,
    filteredConversations, exportHandlers,
  } = useConversationData(selectedConversations)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-destructive font-semibold mb-2">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure you've added your Supabase credentials in Project Settings (gear icon in top right):
              <br />• NEXT_PUBLIC_SUPABASE_URL
              <br />• NEXT_PUBLIC_SUPABASE_ANON_KEY
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!selectedConversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No conversations found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[30%_70%] gap-0" style={{ height: "calc(100vh - 200px)" }}>
      {/* LEFT PANEL */}
      <div
        className="border-r-2 border-primary/30 bg-gradient-to-b from-card via-card to-background grid gap-0"
        style={{ gridTemplateRows: "auto auto 1fr", height: "100%" }}
      >
        <div className="p-4 border-b-2 border-primary/30 bg-gradient-to-r from-card to-background flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
            <Input
              placeholder="SEARCH TRANSCRIPTS..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter("searchQuery", e.target.value)}
              className="pl-9 font-mono text-xs uppercase border-2 border-primary/50 focus:border-accent"
            />
          </div>
          <ThemeToggle />
        </div>

        <ConversationFilterPanel
          selectedOutcomes={filters.selectedOutcomes}
          onOutcomesChange={(v) => updateFilter("selectedOutcomes", v)}
          scoreRange={filters.scoreRange}
          onScoreRangeChange={(v) => updateFilter("scoreRange", v)}
          turnsRange={filters.turnsRange}
          onTurnsRangeChange={(v) => updateFilter("turnsRange", v)}
          categories={categories}
          selectedCategories={filters.selectedCategories}
          onCategoriesChange={(v) => updateFilter("selectedCategories", v)}
          personas={filteredPersonas}
          selectedPersonas={filters.selectedPersonas}
          onPersonasChange={(v) => updateFilter("selectedPersonas", v)}
          testRuns={testRuns}
          selectedTestRuns={filters.selectedTestRuns}
          onTestRunsChange={(v) => updateFilter("selectedTestRuns", v)}
        />

        <ConversationListPanel
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          selectedConversations={selectedConversations}
          onToggleSelection={toggleConversationSelection}
        />
      </div>

      {/* RIGHT PANEL */}
      <ConversationDetailPanel
        selectedConversation={selectedConversation}
        allConversations={conversations}
        selectedConversations={selectedConversations}
        onExportConversationsCSV={selectedConversations.length >= 2 ? exportHandlers.compareCSV : exportHandlers.csv}
        onExportConversationsPDF={selectedConversations.length >= 2 ? exportHandlers.comparePDF : exportHandlers.pdf}
        onExportConversationsJSON={selectedConversations.length >= 2 ? exportHandlers.compareJSON : exportHandlers.json}
        onExportCompareCSV={exportHandlers.compareCSV}
        onExportComparePDF={exportHandlers.comparePDF}
        onExportCompareJSON={exportHandlers.compareJSON}
      />
    </div>
  )
}
