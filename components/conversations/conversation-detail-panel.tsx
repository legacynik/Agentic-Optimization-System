"use client"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConversationTranscript } from "@/components/conversation-transcript"
import { ConversationEvaluation } from "@/components/conversation-evaluation"
import { ConversationNotes } from "@/components/conversation-notes"
import { ConversationCompare } from "@/components/conversation-compare"
import { ExportMenu } from "@/components/export-menu"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { getConversationSummary } from "./helpers"

interface ConversationDetailPanelProps {
  selectedConversation: PersonaPerformanceRow
  allConversations: PersonaPerformanceRow[]
  selectedConversations: string[]
  onExportConversationsCSV: () => void
  onExportConversationsPDF: () => void
  onExportConversationsJSON: () => void
  onExportCompareCSV: () => void
  onExportComparePDF: () => void
  onExportCompareJSON: () => void
}

export function ConversationDetailPanel({
  selectedConversation,
  allConversations,
  selectedConversations,
  onExportConversationsCSV,
  onExportConversationsPDF,
  onExportConversationsJSON,
  onExportCompareCSV,
  onExportComparePDF,
  onExportCompareJSON,
}: ConversationDetailPanelProps) {
  const hasMultipleSelected = selectedConversations.length >= 2
  const selectedConvsData = allConversations.filter((c) =>
    selectedConversations.includes(String(c.conversationid))
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-background via-card/20 to-background" style={{ height: "100%" }}>
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
            {hasMultipleSelected && (
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
              onExportCSV={hasMultipleSelected ? onExportCompareCSV : onExportConversationsCSV}
              onExportPDF={hasMultipleSelected ? onExportComparePDF : onExportConversationsPDF}
              onExportJSON={hasMultipleSelected ? onExportCompareJSON : onExportConversationsJSON}
              label={hasMultipleSelected ? "Export Compare" : "Export"}
              size="sm"
            />
          </div>
        </div>

        <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
          <ConversationTranscript transcript={selectedConversation?.conversations_transcripts || ""} />
        </TabsContent>

        <TabsContent value="evaluation" className="flex-1 overflow-auto m-0">
          <ConversationEvaluation conversation={selectedConversation} allConversations={allConversations} />
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-auto p-6 m-0">
          <ConversationNotes
            conversationId={selectedConversation.conversationid}
            initialNotes={getConversationSummary(selectedConversation).human_notes || ""}
          />
        </TabsContent>

        {hasMultipleSelected && (
          <TabsContent value="compare" className="flex-1 overflow-auto p-6 m-0">
            <ConversationCompare conversations={selectedConvsData} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
