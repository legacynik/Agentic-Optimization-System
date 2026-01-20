'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Users,
  Sparkles,
  Check,
  X,
  Edit,
  AlertCircle,
  Bot,
  UserCheck,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  MessageSquarePlus,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

/**
 * Persona interface matching the database schema (v2.4)
 * validation_status: only 'pending' or 'validated' (simplified from 5 states)
 */
interface Persona {
  id: string
  name: string
  description: string | null
  psychological_profile: string | null
  personaprompt: string | null
  category: string | null
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  behaviors: string[] | null
  created_by: 'ai' | 'human' | 'template'
  validated_by_human: boolean
  validation_status: 'pending' | 'validated'  // v2.4: only 2 states
  feedback_notes?: FeedbackNote[]
}

/**
 * Feedback note structure for persona feedback
 */
interface FeedbackNote {
  note: string
  category?: 'behavior' | 'difficulty' | 'realism' | 'other'
  created_at: string
}

interface PersonaWorkshopProps {
  promptName: string
  promptVersion: string
  onPersonasSaved?: (personas: Persona[]) => void
}

/**
 * PersonaWorkshop - Component for managing and validating AI-generated personas
 *
 * Features:
 * - Fetches personas from /api/personas
 * - Triggers generation via n8n workflow (when configured)
 * - Validates personas (pending → validated)
 * - Submits feedback via /api/personas/[id]/feedback
 *
 * @see PRD sections 10.5, 10.8 for UI specifications
 */
export function PersonaWorkshop({ promptName, promptVersion, onPersonasSaved }: PersonaWorkshopProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackPersona, setFeedbackPersona] = useState<Persona | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState<'behavior' | 'difficulty' | 'realism' | 'other'>('other')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  /**
   * Fetches personas from the API
   * Filters by prompt if provided
   */
  const fetchPersonas = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (promptName) {
        params.set('created_for_prompt', promptName)
      }
      params.set('limit', '100')

      const response = await fetch(`/api/personas?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch personas')
      }

      const result = await response.json()
      // Map API response to component interface
      const mappedPersonas: Persona[] = (result.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        psychological_profile: p.psychological_profile,
        personaprompt: p.personaprompt,
        category: p.category,
        difficulty: p.difficulty || 'medium',
        behaviors: p.behaviors || [],
        created_by: p.created_by || 'human',
        validated_by_human: p.validated_by_human,
        validation_status: p.validation_status || 'pending',
        feedback_notes: p.feedback_notes || []
      }))

      setPersonas(mappedPersonas)
      console.log(`[PersonaWorkshop] Fetched ${mappedPersonas.length} personas`)
    } catch (error) {
      console.error('[PersonaWorkshop] Error fetching personas:', error)
      toast.error('Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }, [promptName])

  // Fetch personas on mount and when promptName changes
  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

  /**
   * Triggers persona generation via n8n workflow
   * If workflow not configured, shows informational message
   */
  const generatePersonas = async () => {
    setIsGenerating(true)

    try {
      // Check if persona generator workflow is configured
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()

      const generatorConfig = settings.data?.find(
        (c: any) => c.workflow_type === 'personas_generator'
      )

      if (!generatorConfig?.webhook_url || !generatorConfig?.is_active) {
        toast.info(
          'Persona Generator workflow not configured. Configure it in Settings to enable AI generation.',
          { duration: 5000 }
        )
        setIsGenerating(false)
        return
      }

      // Trigger the n8n workflow
      const response = await fetch(generatorConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_name: promptName,
          prompt_version: promptVersion,
          count: 5,
          criteria: {
            difficulty_mix: { easy: 0.3, medium: 0.4, hard: 0.2, extreme: 0.1 },
            categories: ['decision_maker', 'skeptical', 'busy', 'collaborative']
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to trigger persona generation')
      }

      toast.success('Persona generation started! Refresh in a few moments to see new personas.')

      // Refresh personas after a delay to see newly generated ones
      setTimeout(() => {
        fetchPersonas()
      }, 5000)

    } catch (error) {
      console.error('[PersonaWorkshop] Error generating personas:', error)
      toast.error('Failed to generate personas. Check Settings for workflow configuration.')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Validates a persona by updating its status in the database
   * v2.4: Only 'pending' → 'validated' transition supported
   */
  const validatePersona = async (personaId: string, action: 'validate' | 'reject') => {
    try {
      if (action === 'reject') {
        // For rejection, we delete the persona
        const response = await fetch(`/api/personas/${personaId}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          throw new Error('Failed to delete persona')
        }
        setPersonas(prev => prev.filter(p => p.id !== personaId))
        toast.success('Persona rejected and removed')
      } else {
        // For validation, update status to 'validated'
        const response = await fetch(`/api/personas/${personaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            validation_status: 'validated',
            validated_by_human: true
          })
        })
        if (!response.ok) {
          throw new Error('Failed to validate persona')
        }
        setPersonas(prev => prev.map(p =>
          p.id === personaId
            ? { ...p, validated_by_human: true, validation_status: 'validated' }
            : p
        ))
        toast.success('Persona validated')
      }
    } catch (error) {
      console.error('[PersonaWorkshop] Error validating persona:', error)
      toast.error('Failed to update persona')
    }
  }

  /**
   * Opens the edit dialog for a persona
   */
  const editPersona = (persona: Persona) => {
    setEditingPersona({ ...persona })
    setShowEditDialog(true)
  }

  /**
   * Saves edited persona to the database
   */
  const saveEditedPersona = async () => {
    if (!editingPersona) return

    try {
      const isNew = editingPersona.id.startsWith('new-')

      if (isNew) {
        // Create new persona
        const response = await fetch('/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingPersona.name,
            description: editingPersona.description,
            psychological_profile: editingPersona.psychological_profile,
            personaprompt: editingPersona.personaprompt || editingPersona.psychological_profile || '',
            category: editingPersona.category,
            difficulty: editingPersona.difficulty,
            behaviors: editingPersona.behaviors,
            created_for_prompt: promptName,
            created_by: 'human'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create persona')
        }

        const newPersona = await response.json()
        setPersonas(prev => [{ ...newPersona, validation_status: 'pending' }, ...prev])
        toast.success('Persona created')
      } else {
        // Update existing persona
        const response = await fetch(`/api/personas/${editingPersona.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingPersona.name,
            description: editingPersona.description,
            psychological_profile: editingPersona.psychological_profile,
            category: editingPersona.category,
            difficulty: editingPersona.difficulty,
            behaviors: editingPersona.behaviors
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update persona')
        }

        setPersonas(prev => prev.map(p =>
          p.id === editingPersona.id ? editingPersona : p
        ))
        toast.success('Persona updated')
      }

      setShowEditDialog(false)
      setEditingPersona(null)
    } catch (error) {
      console.error('[PersonaWorkshop] Error saving persona:', error)
      toast.error('Failed to save persona')
    }
  }

  /**
   * Deletes a persona from the database
   */
  const deletePersona = async (personaId: string) => {
    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete persona')
      }

      setPersonas(prev => prev.filter(p => p.id !== personaId))
      toast.success('Persona deleted')
    } catch (error) {
      console.error('[PersonaWorkshop] Error deleting persona:', error)
      toast.error('Failed to delete persona')
    }
  }

  /**
   * Opens dialog to add a new custom persona
   */
  const addCustomPersona = () => {
    const newPersona: Persona = {
      id: `new-${Date.now()}`,
      name: 'New Persona',
      description: '',
      psychological_profile: '',
      personaprompt: '',
      category: 'Custom',
      difficulty: 'medium',
      behaviors: [],
      created_by: 'human',
      validated_by_human: false,
      validation_status: 'pending'
    }
    setEditingPersona(newPersona)
    setShowEditDialog(true)
  }

  /**
   * Saves all validated personas and triggers callback
   */
  const saveAllPersonas = () => {
    const validatedPersonas = personas.filter(p => p.validation_status === 'validated')
    onPersonasSaved?.(validatedPersonas)
    toast.success(`${validatedPersonas.length} validated personas saved`)
  }

  /**
   * Opens feedback dialog for a persona (PRD 10.5)
   */
  const openFeedbackDialog = (persona: Persona) => {
    setFeedbackPersona(persona)
    setFeedbackText('')
    setFeedbackCategory('other')
    setShowFeedbackDialog(true)
  }

  /**
   * Submits feedback for a persona to /api/personas/[id]/feedback
   */
  const submitFeedback = async () => {
    if (!feedbackPersona || !feedbackText.trim()) {
      toast.error('Please enter feedback')
      return
    }

    setIsSubmittingFeedback(true)
    try {
      const response = await fetch(`/api/personas/${feedbackPersona.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: feedbackText.trim(),
          category: feedbackCategory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      toast.success('Feedback submitted. May trigger re-validation.')
      setShowFeedbackDialog(false)
      setFeedbackPersona(null)
      setFeedbackText('')
    } catch (error) {
      console.error('[PersonaWorkshop] Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  /**
   * Returns status badge based on validation_status (v2.4: only 2 states)
   * @see PRD 10.8 for badge specifications
   */
  const getStatusBadge = (persona: Persona) => {
    switch (persona.validation_status) {
      case 'validated':
        return <Badge className="bg-green-500 text-white">✓ Validated</Badge>
      default:
        return <Badge variant="secondary">Pending Validation</Badge>
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'hard': return 'text-orange-600 bg-orange-50'
      case 'extreme': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-500" />
              Persona Workshop
            </CardTitle>
            <CardDescription>Loading personas...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <Button
                variant="outline"
                onClick={() => fetchPersonas()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={addCustomPersona}
              >
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

      {/* Tabs for Different Views - v2.4: pending/validated only */}
      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validation">
            Pending ({personas.filter(p => p.validation_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validated ({personas.filter(p => p.validation_status === 'validated').length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Personas ({personas.length})
          </TabsTrigger>
        </TabsList>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          {personas.filter(p => p.validation_status === 'pending').length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">No personas pending validation</p>
              <Button
                onClick={generatePersonas}
                className="mt-4"
                variant="outline"
              >
                Generate Personas
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {personas.filter(p => p.validation_status === 'pending').map((persona, idx) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border-2 border-yellow-500/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            {persona.created_by === 'ai' ? <Bot className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{persona.name}</CardTitle>
                            <CardDescription>{persona.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(persona.difficulty)}>
                            {persona.difficulty}
                          </Badge>
                          {getStatusBadge(persona)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Profilo Psicologico</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {persona.psychological_profile}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Comportamenti</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(persona.behaviors || []).map((behavior, idx) => (
                              <Badge key={idx} variant="outline">
                                {behavior}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePersona(persona.id)}
                            title="Delete persona"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editPersona(persona)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFeedbackDialog(persona)}
                            title="Add feedback"
                          >
                            <MessageSquarePlus className="w-4 h-4 mr-1" />
                            Feedback
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => validatePersona(persona.id, 'reject')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => validatePersona(persona.id, 'validate')}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Validate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Validated Tab - v2.4: only 'validated' status */}
        <TabsContent value="validated" className="space-y-4">
          {personas.filter(p => p.validation_status === 'validated').length === 0 ? (
            <Card className="p-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">No validated personas yet</p>
              <p className="text-xs text-muted-foreground mt-2">
                Validate personas from the Pending tab to see them here
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personas
                .filter(p => p.validation_status === 'validated')
                .map((persona) => (
                  <Card key={persona.id} className="border-green-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{persona.name}</CardTitle>
                        {getStatusBadge(persona)}
                      </div>
                      <CardDescription className="text-xs">
                        {persona.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {(persona.behaviors || []).slice(0, 3).map((behavior, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {behavior}
                          </Badge>
                        ))}
                        {(persona.behaviors || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(persona.behaviors || []).length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFeedbackDialog(persona)}
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-1" />
                          Feedback
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editPersona(persona)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* All Personas Tab */}
        <TabsContent value="all" className="space-y-4">
          {personas.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">No personas found</p>
              <p className="text-xs text-muted-foreground mt-2">
                Generate personas or add custom ones to get started
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona) => (
                <Card key={persona.id} className={persona.validation_status === 'validated' ? 'border-green-500/20' : 'border-yellow-500/20'}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{persona.name}</CardTitle>
                      {getStatusBadge(persona)}
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {persona.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge className={getDifficultyColor(persona.difficulty)}>
                        {persona.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {persona.created_by === 'ai' ? '🤖 AI' : persona.created_by === 'template' ? '📋 Template' : '👤 Human'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button - only show if there are validated personas */}
      {personas.filter(p => p.validation_status === 'validated').length > 0 && onPersonasSaved && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={saveAllPersonas}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save {personas.filter(p => p.validation_status === 'validated').length} Validated Personas
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingPersona?.id.startsWith('new-') ? 'Create Persona' : 'Edit Persona'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingPersona?.id.startsWith('new-')
                ? 'Fill in the details for the new persona'
                : 'Modify the persona details below'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editingPersona && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingPersona.name}
                  onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                  placeholder="Persona name"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingPersona.description || ''}
                  onChange={(e) => setEditingPersona({ ...editingPersona, description: e.target.value })}
                  placeholder="Brief description of the persona"
                />
              </div>

              <div>
                <Label>Psychological Profile</Label>
                <Textarea
                  value={editingPersona.psychological_profile || ''}
                  onChange={(e) => setEditingPersona({ ...editingPersona, psychological_profile: e.target.value })}
                  placeholder="Detailed psychological traits and behavior patterns"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingPersona.category || ''}
                    onChange={(e) => setEditingPersona({ ...editingPersona, category: e.target.value })}
                    placeholder="e.g., Skeptical, Collaborative"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={editingPersona.difficulty}
                    onValueChange={(value: 'easy' | 'medium' | 'hard' | 'extreme') =>
                      setEditingPersona({ ...editingPersona, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="extreme">Extreme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Behaviors (comma separated)</Label>
                <Textarea
                  value={(editingPersona.behaviors || []).join(', ')}
                  onChange={(e) => setEditingPersona({
                    ...editingPersona,
                    behaviors: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                  })}
                  placeholder="e.g., Asks many questions, Compares options, Seeks reassurance"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEditedPersona}>
              {editingPersona?.id.startsWith('new-') ? 'Create' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Dialog - PRD 10.5 */}
      <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Feedback for {feedbackPersona?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Provide feedback on this persona&apos;s behavior during testing.
              This feedback may trigger persona re-validation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Feedback Category</Label>
              <Select
                value={feedbackCategory}
                onValueChange={(value: 'behavior' | 'difficulty' | 'realism' | 'other') =>
                  setFeedbackCategory(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="behavior">Behavior issue</SelectItem>
                  <SelectItem value="difficulty">Difficulty calibration</SelectItem>
                  <SelectItem value="realism">Realism concern</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Feedback</Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe the issue or suggestion for this persona..."
                rows={4}
              />
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Adding feedback may trigger persona re-validation
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingFeedback}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitFeedback}
              disabled={isSubmittingFeedback || !feedbackText.trim()}
            >
              {isSubmittingFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}