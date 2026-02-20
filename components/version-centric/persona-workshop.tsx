'use client'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Sparkles,
  RefreshCw,
  Plus,
  Save,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { PersonaWorkshopProps } from './persona/types'
import { usePersonaWorkshop } from './persona/use-persona-workshop'
import { PersonaList } from './persona/persona-list'
import { PersonaEditDialog } from './persona/persona-edit-dialog'
import { PersonaFeedbackDialog } from './persona/persona-feedback-dialog'

/**
 * PersonaWorkshop - Component for managing and validating AI-generated personas
 *
 * Refactored into smaller subcomponents for maintainability:
 * - persona/types.ts - Shared types and helpers
 * - persona/use-persona-workshop.ts - Business logic hook
 * - persona/persona-card.tsx - Individual persona card
 * - persona/persona-list.tsx - Tabbed list views
 * - persona/persona-edit-dialog.tsx - Edit/Create dialog
 * - persona/persona-feedback-dialog.tsx - Feedback dialog
 *
 * Features:
 * - Fetches personas from /api/personas
 * - Triggers generation via n8n workflow (when configured)
 * - Validates personas (pending → validated)
 * - Submits feedback via /api/personas/[id]/feedback
 *
 * @see PRD sections 10.5, 10.8 for UI specifications
 */
export function PersonaWorkshop({
  promptName,
  promptVersion,
  onPersonasSaved
}: PersonaWorkshopProps) {
  const {
    personas,
    isLoading,
    isGenerating,
    editingPersona,
    showEditDialog,
    showFeedbackDialog,
    feedbackPersona,
    feedbackText,
    feedbackCategory,
    isSubmittingFeedback,
    setEditingPersona,
    setShowEditDialog,
    setShowFeedbackDialog,
    setFeedbackText,
    setFeedbackCategory,
    fetchPersonas,
    generatePersonas,
    validatePersona,
    editPersona,
    saveEditedPersona,
    deletePersona,
    addCustomPersona,
    openFeedbackDialog,
    submitFeedback,
    llmValidatePersona,
    approveOverride
  } = usePersonaWorkshop({ promptName, promptVersion })

  /**
   * Saves all validated personas and triggers callback
   */
  const saveAllPersonas = () => {
    const validatedPersonas = personas.filter(p => p.validation_status === 'validated')
    onPersonasSaved?.(validatedPersonas)
    toast.success(`${validatedPersonas.length} validated personas saved`)
  }

  const validatedCount = personas.filter(p => p.validation_status === 'validated').length

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-500" />
            Persona Workshop
          </CardTitle>
          <CardDescription>Loading personas...</CardDescription>
        </CardHeader>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-500" />
                Persona Workshop
              </CardTitle>
              <CardDescription>
                Generate and validate personas for {promptName} {promptVersion}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchPersonas()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={addCustomPersona}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </Button>
              <Button
                onClick={generatePersonas}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Personas
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Persona List with Tabs */}
      <PersonaList
        personas={personas}
        onEdit={editPersona}
        onDelete={deletePersona}
        onValidate={(id) => validatePersona(id, 'validate')}
        onReject={(id) => validatePersona(id, 'reject')}
        onFeedback={openFeedbackDialog}
        onGenerate={generatePersonas}
        onLlmValidate={llmValidatePersona}
        onApproveOverride={approveOverride}
      />

      {/* Save Button - only show if there are validated personas */}
      {validatedCount > 0 && onPersonasSaved && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={saveAllPersonas}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save {validatedCount} Validated Personas
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <PersonaEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingPersona={editingPersona}
        setEditingPersona={setEditingPersona}
        onSave={saveEditedPersona}
      />

      {/* Feedback Dialog */}
      <PersonaFeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        feedbackPersona={feedbackPersona}
        feedbackText={feedbackText}
        feedbackCategory={feedbackCategory}
        setFeedbackText={setFeedbackText}
        setFeedbackCategory={setFeedbackCategory}
        onSubmit={submitFeedback}
        isSubmitting={isSubmittingFeedback}
      />
    </div>
  )
}
