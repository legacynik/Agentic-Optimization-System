"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { ConversationTranscript } from "@/components/conversation-transcript"
import { ConversationEvaluation } from "@/components/conversation-evaluation"
import { ConversationNotes } from "@/components/conversation-notes"
import { ConversationCompare } from "@/components/conversation-compare"
import { ExportMenu } from "@/components/export-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { fetchPersonasPerformance, fetchUniquePersonas, fetchUniqueCategories } from "@/lib/queries"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { useDashboardStore } from "@/stores/dashboard-store"
import { exportConversationsToCSV, exportCriteriaToCSV } from "@/lib/export-csv"
import { exportConversationsToPDF, exportCriteriaToPDF } from "@/lib/export-pdf"
import { exportConversationsToJSON, exportCriteriaToJSON } from "@/lib/export-json"

// Helper functions to parse JSON string data from Supabase
const getConversationSummary = (conv: PersonaPerformanceRow) => {
  try {
    const parsed = JSON.parse(conv.conversations_summary)
    return Array.isArray(parsed) ? parsed[0] : parsed
  } catch {
    return { outcome: "partial", summary: "", human_notes: null, crashed_app: false }
  }
}

const getCriteriaList = (conv: PersonaPerformanceRow) => {
  try {
    const parsed = JSON.parse(conv.all_criteria_details || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ConversationExplorer() {
  // Zustand store for multi-select
  const { selectedConversations, toggleConversationSelection, clearConversationSelections } = useDashboardStore()

  const [conversations, setConversations] = useState<PersonaPerformanceRow[]>([])
  const [personas, setPersonas] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedConversation, setSelectedConversation] = useState<PersonaPerformanceRow | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [selectedTestRuns, setSelectedTestRuns] = useState<string[]>([])
  const [scoreRange, setScoreRange] = useState([0, 10])
  const [turnsRange, setTurnsRange] = useState([0, 20])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [conversationsData, personasData, categoriesData] = await Promise.all([
          fetchPersonasPerformance(),
          fetchUniquePersonas(),
          fetchUniqueCategories(),
        ])

        setConversations(conversationsData)
        setPersonas(personasData)
        setCategories(categoriesData)
        if (conversationsData.length > 0) {
          setSelectedConversation(conversationsData[0])
        }
        setError(null)
      } catch (err) {
        console.error("[v0] Error loading conversation data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const testRuns = useMemo(() => {
    const testRunsSet = new Set<string>()
    conversations.forEach((conv) => {
      if (conv.testrunid) {
        testRunsSet.add(conv.testrunid)
      }
    })
    return Array.from(testRunsSet).sort()
  }, [conversations])

  const filteredConversations = conversations.filter((conv) => {
    const summary = getConversationSummary(conv)
    const score = Number.parseFloat(conv.avg_score)
    const turns = Math.round(Number.parseFloat(conv.avg_turns))

    const matchesSearch =
      searchQuery === "" ||
      conv.conversations_transcripts.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.summary?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesOutcome = selectedOutcomes.length === 0 || selectedOutcomes.includes(summary.outcome?.toLowerCase())

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(conv.persona_category)

    const matchesPersona =
      selectedCategories.length > 0 ? true : selectedPersonas.length === 0 || selectedPersonas.includes(conv.personaid)

    const matchesTestRun = selectedTestRuns.length === 0 || selectedTestRuns.includes(conv.testrunid)

    const matchesScore = score >= scoreRange[0] && score <= scoreRange[1]
    const matchesTurns = turns >= turnsRange[0] && turns <= turnsRange[1]

    return (
      matchesSearch &&
      matchesOutcome &&
      matchesCategory &&
      matchesPersona &&
      matchesTestRun &&
      matchesScore &&
      matchesTurns
    )
  })

  const filteredPersonas =
    selectedCategories.length > 0 ? personas.filter((p) => selectedCategories.includes(p.category)) : personas

  // Helper function to build criteria matrix (must be before any early returns)
  const buildCriteriaMatrix = (convs: PersonaPerformanceRow[]) => {
    const allCriteria = Array.from(
      new Set(convs.flatMap((conv) => getCriteriaList(conv).map((c: any) => c.criteria_name)))
    ).sort()

    return allCriteria.map((criteriaName) => {
      const scores: Record<string, number> = {}
      convs.forEach((conv) => {
        const criteria = getCriteriaList(conv).find((c: any) => c.criteria_name === criteriaName)
        scores[String(conv.conversationid)] = criteria?.score ?? 0
      })
      return { criteriaName, scores }
    })
  }

  // Export handlers (must be defined before any early returns)
  const selectedConvsData = useMemo(() => {
    return conversations.filter(c => selectedConversations.includes(String(c.conversationid)))
  }, [conversations, selectedConversations])

  const handleExportConversationsCSV = () => {
    exportConversationsToCSV(filteredConversations)
  }

  const handleExportConversationsPDF = () => {
    exportConversationsToPDF(filteredConversations)
  }

  const handleExportConversationsJSON = () => {
    exportConversationsToJSON(filteredConversations)
  }

  const handleExportCompareCSV = () => {
    if (selectedConvsData.length >= 2) {
      const criteriaMatrix = buildCriteriaMatrix(selectedConvsData)
      exportCriteriaToCSV(selectedConvsData, criteriaMatrix)
    }
  }

  const handleExportComparePDF = () => {
    if (selectedConvsData.length >= 2) {
      const criteriaMatrix = buildCriteriaMatrix(selectedConvsData)
      exportCriteriaToPDF(selectedConvsData, criteriaMatrix)
    }
  }

  const handleExportCompareJSON = () => {
    if (selectedConvsData.length >= 2) {
      const criteriaMatrix = buildCriteriaMatrix(selectedConvsData)
      exportCriteriaToJSON(selectedConvsData, criteriaMatrix)
    }
  }

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
      {/* LEFT PANEL - 30% */}
      <div
        className="border-r-2 border-primary/30 bg-gradient-to-b from-card via-card to-background grid gap-0"
        style={{
          gridTemplateRows: "auto auto 1fr",
          height: "100%",
        }}
      >
        {/* Search Bar - Fixed height */}
        <div className="p-4 border-b-2 border-primary/30 bg-gradient-to-r from-card to-background flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
            <Input
              placeholder="SEARCH TRANSCRIPTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-mono text-xs uppercase border-2 border-primary/50 focus:border-accent"
            />
          </div>
          {/* Theme Toggle Button */}
          <ThemeToggle />
        </div>

        {/* Filters Section - Fixed max height with internal scroll */}
        <div
          className="border-b-2 border-primary/30 overflow-y-auto"
          style={{
            maxHeight: "250px",
          }}
        >
          <Accordion type="multiple" defaultValue={["general"]} className="px-4">
            {/* General Filters */}
            <AccordionItem value="general" className="border-b-2 border-primary/20">
              <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
                General Filters
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Outcome Filter */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Outcome</Label>
                  <div className="space-y-2">
                    {["success", "partial", "failure"].map((outcome) => (
                      <div key={outcome} className="flex items-center space-x-2">
                        <Checkbox
                          id={outcome}
                          checked={selectedOutcomes.includes(outcome)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOutcomes([...selectedOutcomes, outcome])
                            } else {
                              setSelectedOutcomes(selectedOutcomes.filter((o) => o !== outcome))
                            }
                          }}
                        />
                        <Label htmlFor={outcome} className="text-sm capitalize cursor-pointer">
                          {outcome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Filter */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    Score: {scoreRange[0]} - {scoreRange[1]}
                  </Label>
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={scoreRange}
                    onValueChange={setScoreRange}
                    className="w-full"
                  />
                </div>

                {/* Turns Filter */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    Turns: {turnsRange[0]} - {turnsRange[1]}
                  </Label>
                  <Slider
                    min={0}
                    max={20}
                    step={1}
                    value={turnsRange}
                    onValueChange={setTurnsRange}
                    className="w-full"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Categories Filter */}
            <AccordionItem value="categories" className="border-b-2 border-primary/20">
              <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
                Categories
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-2">
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category])
                              setSelectedPersonas([])
                            } else {
                              setSelectedCategories(selectedCategories.filter((c) => c !== category))
                            }
                          }}
                        />
                        <Label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                          {category}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No categories available</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Personas Filter */}
            <AccordionItem value="personas" className="border-b-2 border-primary/20">
              <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
                Personas {selectedCategories.length > 0 && "(filtered)"}
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {filteredPersonas && filteredPersonas.length > 0 ? (
                    filteredPersonas.map((persona) => (
                      <div key={persona.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={persona.id}
                          checked={selectedPersonas.includes(persona.id)}
                          disabled={selectedCategories.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPersonas([...selectedPersonas, persona.id])
                            } else {
                              setSelectedPersonas(selectedPersonas.filter((p) => p !== persona.id))
                            }
                          }}
                        />
                        <Label
                          htmlFor={persona.id}
                          className={`text-sm cursor-pointer ${selectedCategories.length > 0 ? "text-muted-foreground" : ""}`}
                        >
                          {persona.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No personas available</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Test Runs Filter */}
            <AccordionItem value="testruns" className="border-b-0">
              <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
                Test Runs
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {testRuns && testRuns.length > 0 ? (
                    testRuns.map((testrun) => (
                      <div key={testrun} className="flex items-center space-x-2">
                        <Checkbox
                          id={`testrun-${testrun}`}
                          checked={selectedTestRuns.includes(testrun)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTestRuns([...selectedTestRuns, testrun])
                            } else {
                              setSelectedTestRuns(selectedTestRuns.filter((t) => t !== testrun))
                            }
                          }}
                        />
                        <Label htmlFor={`testrun-${testrun}`} className="text-sm cursor-pointer font-mono">
                          {testrun}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No test runs available</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Conversation List - Takes remaining space with scroll */}
        <div className="overflow-y-auto p-4 space-y-3">
          {filteredConversations.map((conv) => {
            const summary = getConversationSummary(conv)
            const outcome = summary.outcome?.toLowerCase() || "partial"
            const allCriteria = getCriteriaList(conv)
            const crashed = summary.crashed_app || false
            const score = Number.parseFloat(conv.avg_score)
            const turns = Math.round(Number.parseFloat(conv.avg_turns))

            const borderColor =
              score >= 8 ? "border-l-accent" : score >= 6 ? "border-l-secondary" : "border-l-destructive"

            const OutcomeIcon = outcome === "success" ? CheckCircle2 : outcome === "partial" ? AlertTriangle : XCircle

            const outcomeColor =
              outcome === "success" ? "text-accent" : outcome === "partial" ? "text-secondary" : "text-destructive"

            const criticalCriteria = allCriteria
              .filter((c: any) => c.score < 6.5)
              .sort((a: any, b: any) => a.score - b.score)
              .slice(0, 3)

            const isSelected = selectedConversations.includes(String(conv.conversationid))

            return (
              <Card
                key={conv.conversationid}
                className={`transition-all border-l-4 border-2 ${borderColor} ${
                  selectedConversation?.conversationid === conv.conversationid
                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/20"
                    : "bg-card border-border hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
                }`}
              >
                <CardContent className="p-2.5 space-y-2">
                  {/* Header: Checkbox + Score + Outcome/Crash */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleConversationSelection(String(conv.conversationid))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select conversation ${conv.conversationid}`}
                      />
                      <Badge
                        variant="secondary"
                        className="font-bold text-xl px-3 py-1 bg-primary text-primary-foreground cursor-pointer"
                        onClick={() => setSelectedConversation(conv)}
                      >
                        {score.toFixed(1)}
                      </Badge>
                    </div>
                    <Badge
                      variant="secondary"
                      className="font-bold text-xl px-3 py-1 bg-primary text-primary-foreground"
                    >
                      {score.toFixed(1)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {crashed && (
                        <Badge variant="destructive" className="text-xs font-bold uppercase tracking-wider">
                          CRASH
                        </Badge>
                      )}
                      <div className={`flex items-center gap-1 ${outcomeColor}`}>
                        <OutcomeIcon className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">{outcome}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info Line 1: Category | Persona */}
                  <div className="text-sm text-muted-foreground font-mono">
                    <span className="font-semibold">{conv.persona_category}</span>
                    <span className="mx-1.5 text-primary">|</span>
                    <span>{conv.personaid}</span>
                  </div>

                  {/* Meta Info Line 2: Test Run | Version | Turns */}
                  <div className="text-sm text-muted-foreground font-mono">
                    <span>...{conv.testrunid?.slice(-6) || "N/A"}</span>
                    <span className="mx-1.5 text-primary">|</span>
                    <span>{conv.agentversion}</span>
                    <span className="mx-1.5 text-primary">|</span>
                    <span className="font-bold text-accent">{turns}T</span>
                  </div>

                  {/* Critical Criteria or All OK */}
                  {criticalCriteria.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {criticalCriteria.map((criteria: any) => (
                        <div
                          key={criteria.criteria_name}
                          className="flex items-center gap-2 bg-destructive/20 border border-destructive/50 rounded px-2 py-1"
                        >
                          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 font-bold">
                            ⚠
                          </Badge>
                          <span className="text-xs text-foreground/90 truncate flex-1 font-mono uppercase">
                            {criteria.criteria_name}
                          </span>
                          <span className="text-sm font-bold text-destructive">{criteria.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs text-accent border-accent border-2 mt-1 font-bold uppercase"
                    >
                      All criteria ✓
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANEL - 70% */}
      <div
        className="flex flex-col bg-gradient-to-br from-background via-card/20 to-background"
        style={{ height: "100%" }}
      >
        {/* Header */}
        <div className="border-b-2 border-primary/30 bg-gradient-to-r from-card to-background p-4 shadow-md shadow-primary/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
              {selectedConversation.conversationid}
            </h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-2 border-primary/50 font-mono uppercase">
                {selectedConversation.persona_category}
              </Badge>
              <Badge variant="outline" className="border-2 border-primary/50 font-mono uppercase">
                {selectedConversation.personaid}
              </Badge>
              <Badge variant="outline" className="border-2 border-accent/50 font-mono uppercase">
                {selectedConversation.agentversion}
              </Badge>
              <Badge variant="outline" className="border-2 border-secondary/50 font-mono uppercase">
                {selectedConversation.testrunid}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{selectedConversation.persona_description}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-primary/30 bg-gradient-to-r from-card to-background">
            <TabsList className="rounded-none bg-transparent px-4">
              <TabsTrigger
                value="transcript"
                className="font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Transcript
              </TabsTrigger>
              <TabsTrigger
                value="evaluation"
                className="font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Evaluation
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Human Notes
              </TabsTrigger>
              {selectedConversations.length >= 2 && (
                <TabsTrigger
                  value="compare"
                  className="font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Compare ({selectedConversations.length})
                </TabsTrigger>
              )}
            </TabsList>
            <div className="px-4">
              <ExportMenu
                onExportCSV={selectedConversations.length >= 2 ? handleExportCompareCSV : handleExportConversationsCSV}
                onExportPDF={selectedConversations.length >= 2 ? handleExportComparePDF : handleExportConversationsPDF}
                onExportJSON={selectedConversations.length >= 2 ? handleExportCompareJSON : handleExportConversationsJSON}
                label={selectedConversations.length >= 2 ? "Export Compare" : "Export"}
                size="sm"
              />
            </div>
          </div>

          <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
            <ConversationTranscript transcript={selectedConversation?.conversations_transcripts || ""} />
          </TabsContent>

          <TabsContent value="evaluation" className="flex-1 overflow-auto m-0">
            <ConversationEvaluation conversation={selectedConversation} allConversations={conversations} />
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-auto p-6 m-0">
            <ConversationNotes
              conversationId={selectedConversation.conversationid}
              initialNotes={getConversationSummary(selectedConversation).human_notes || ''}
            />
          </TabsContent>

          {selectedConversations.length >= 2 && (
            <TabsContent value="compare" className="flex-1 overflow-auto p-6 m-0">
              <ConversationCompare
                conversations={conversations.filter((c) =>
                  selectedConversations.includes(String(c.conversationid))
                )}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
