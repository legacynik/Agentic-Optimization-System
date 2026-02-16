import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Persona } from './types'
import {
  fetchPersonasFromAPI,
  triggerPersonaGeneration,
  updatePersonaValidation,
  deletePersonaAPI,
  createPersona,
  updatePersona,
  submitPersonaFeedback
} from './api-actions'

interface UsePersonaWorkshopProps {
  promptName: string
  promptVersion: string
}

/**
 * Custom hook containing all business logic for PersonaWorkshop
 * Handles state management and coordinates API calls
 */
export function usePersonaWorkshop({ promptName, promptVersion }: UsePersonaWorkshopProps) {
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

  const fetchPersonas = useCallback(async () => {
    setIsLoading(true)
    try {
      const mappedPersonas = await fetchPersonasFromAPI(promptName)
      setPersonas(mappedPersonas)
      console.log(`[PersonaWorkshop] Fetched ${mappedPersonas.length} personas`)
    } catch (error) {
      console.error('[PersonaWorkshop] Error fetching personas:', error)
      toast.error('Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }, [promptName])

  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

  const generatePersonas = async () => {
    setIsGenerating(true)
    try {
      const success = await triggerPersonaGeneration(promptName, promptVersion)
      if (success) {
        toast.success('Persona generation started! Refresh in a few moments.')
        setTimeout(() => fetchPersonas(), 5000)
      }
    } catch (error) {
      console.error('[PersonaWorkshop] Error generating personas:', error)
      toast.error('Failed to generate personas. Check Settings.')
    } finally {
      setIsGenerating(false)
    }
  }

  const validatePersona = async (personaId: string, action: 'validate' | 'reject') => {
    try {
      if (action === 'reject') {
        await deletePersonaAPI(personaId)
        setPersonas(prev => prev.filter(p => p.id !== personaId))
        toast.success('Persona rejected and removed')
      } else {
        await updatePersonaValidation(personaId, true)
        setPersonas(prev => prev.map(p => p.id === personaId
          ? { ...p, validated_by_human: true, validation_status: 'validated' } : p))
        toast.success('Persona validated')
      }
    } catch (error) {
      console.error('[PersonaWorkshop] Error validating persona:', error)
      toast.error('Failed to update persona')
    }
  }

  const editPersona = (persona: Persona) => {
    setEditingPersona({ ...persona })
    setShowEditDialog(true)
  }

  const saveEditedPersona = async () => {
    if (!editingPersona) return

    try {
      const isNew = editingPersona.id.startsWith('new-')

      if (isNew) {
        const newPersona = await createPersona(editingPersona, promptName)
        setPersonas(prev => [{ ...newPersona, validation_status: 'pending' }, ...prev])
        toast.success('Persona created')
      } else {
        await updatePersona(editingPersona)
        setPersonas(prev => prev.map(p => p.id === editingPersona.id ? editingPersona : p))
        toast.success('Persona updated')
      }

      setShowEditDialog(false)
      setEditingPersona(null)
    } catch (error) {
      console.error('[PersonaWorkshop] Error saving persona:', error)
      toast.error('Failed to save persona')
    }
  }

  const deletePersona = async (personaId: string) => {
    try {
      await deletePersonaAPI(personaId)
      setPersonas(prev => prev.filter(p => p.id !== personaId))
      toast.success('Persona deleted')
    } catch (error) {
      console.error('[PersonaWorkshop] Error deleting persona:', error)
      toast.error('Failed to delete persona')
    }
  }

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

  const openFeedbackDialog = (persona: Persona) => {
    setFeedbackPersona(persona)
    setFeedbackText('')
    setFeedbackCategory('other')
    setShowFeedbackDialog(true)
  }

  const submitFeedback = async () => {
    if (!feedbackPersona || !feedbackText.trim()) {
      toast.error('Please enter feedback')
      return
    }

    setIsSubmittingFeedback(true)
    try {
      await submitPersonaFeedback(feedbackPersona.id, feedbackText.trim(), feedbackCategory)
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

  return {
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
    submitFeedback
  }
}
