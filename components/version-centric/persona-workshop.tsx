'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Save
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Persona {
  id: string
  name: string
  description: string
  psychological_profile: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  behaviors: string[]
  created_by: 'ai' | 'human' | 'template'
  validated_by_human: boolean
  validation_status: 'pending' | 'approved' | 'rejected' | 'modified'
}

interface PersonaWorkshopProps {
  promptName: string
  promptVersion: string
  onPersonasSaved?: (personas: Persona[]) => void
}

export function PersonaWorkshop({ promptName, promptVersion, onPersonasSaved }: PersonaWorkshopProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Generate personas with N8N workflow
  const generatePersonas = async () => {
    setIsGenerating(true)

    // Simulate N8N workflow trigger (replace with actual webhook call)
    setTimeout(() => {
      const generatedPersonas: Persona[] = [
        {
          id: '1',
          name: 'Paziente Ansioso',
          description: 'Prima visita, molto preoccupato per i sintomi',
          psychological_profile: 'Cerca rassicurazione continua, ha bisogno di spiegazioni dettagliate, tende a fare molte domande',
          category: 'Informativo',
          difficulty: 'easy',
          behaviors: [
            'Ripete le domande',
            'Cerca conferme multiple',
            'Parla dei sintomi in dettaglio',
            'Chiede dei rischi'
          ],
          created_by: 'ai',
          validated_by_human: false,
          validation_status: 'pending'
        },
        {
          id: '2',
          name: 'Manager Impegnato',
          description: 'Ha poco tempo, vuole soluzioni rapide ed efficaci',
          psychological_profile: 'Impaziente, orientato ai risultati, valuta costi-benefici, poco tempo per conversare',
          category: 'Veloce',
          difficulty: 'hard',
          behaviors: [
            'Interrompe spesso',
            'Vuole andare al punto',
            'Chiede tempi e costi subito',
            'Valuta alternative'
          ],
          created_by: 'ai',
          validated_by_human: false,
          validation_status: 'pending'
        },
        {
          id: '3',
          name: 'Scettico Informato',
          description: 'Ha letto su internet, mette in dubbio le competenze',
          psychological_profile: 'Diffidente, vuole prove concrete, confronta informazioni online, cerca validazione esterna',
          category: 'Challenger',
          difficulty: 'extreme',
          behaviors: [
            'Cita articoli online',
            'Chiede credenziali',
            'Confronta prezzi',
            'Mette in dubbio diagnosi',
            'Vuole second opinion'
          ],
          created_by: 'ai',
          validated_by_human: false,
          validation_status: 'pending'
        },
        {
          id: '4',
          name: 'Paziente Collaborativo',
          description: 'Segue le indicazioni, fa domande pertinenti',
          psychological_profile: 'Fiducioso, collaborativo, segue consigli, comunicazione chiara',
          category: 'Standard',
          difficulty: 'easy',
          behaviors: [
            'Ascolta attentamente',
            'Prende appunti',
            'Fa domande chiare',
            'Ringrazia per il servizio'
          ],
          created_by: 'ai',
          validated_by_human: false,
          validation_status: 'pending'
        },
        {
          id: '5',
          name: 'Indeciso Cronico',
          description: 'Non riesce a prendere decisioni, rimanda sempre',
          psychological_profile: 'Ansioso decisionale, paura di sbagliare, necessita molte rassicurazioni, procrastina',
          category: 'Indeciso',
          difficulty: 'medium',
          behaviors: [
            'Dice "ci devo pensare"',
            'Chiede di richiamare',
            'Vuole parlare con altri',
            'Cambia idea spesso'
          ],
          created_by: 'ai',
          validated_by_human: false,
          validation_status: 'pending'
        }
      ]

      setPersonas(generatedPersonas)
      setIsGenerating(false)
    }, 2000)
  }

  const validatePersona = (personaId: string, status: 'approved' | 'rejected') => {
    setPersonas(prev => prev.map(p =>
      p.id === personaId
        ? { ...p, validated_by_human: true, validation_status: status }
        : p
    ))
  }

  const editPersona = (persona: Persona) => {
    setEditingPersona(persona)
    setShowEditDialog(true)
  }

  const saveEditedPersona = () => {
    if (editingPersona) {
      setPersonas(prev => prev.map(p =>
        p.id === editingPersona.id
          ? { ...editingPersona, validation_status: 'modified', validated_by_human: true }
          : p
      ))
      setShowEditDialog(false)
      setEditingPersona(null)
    }
  }

  const deletePersona = (personaId: string) => {
    setPersonas(prev => prev.filter(p => p.id !== personaId))
  }

  const addCustomPersona = () => {
    const newPersona: Persona = {
      id: `custom-${Date.now()}`,
      name: 'Nuova Persona',
      description: '',
      psychological_profile: '',
      category: 'Custom',
      difficulty: 'medium',
      behaviors: [],
      created_by: 'human',
      validated_by_human: true,
      validation_status: 'approved'
    }
    setEditingPersona(newPersona)
    setShowEditDialog(true)
  }

  const saveAllPersonas = () => {
    const validatedPersonas = personas.filter(p =>
      p.validation_status === 'approved' || p.validation_status === 'modified'
    )
    onPersonasSaved?.(validatedPersonas)
  }

  const getStatusBadge = (persona: Persona) => {
    switch (persona.validation_status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>
      case 'modified':
        return <Badge className="bg-blue-500 text-white">Modified</Badge>
      default:
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>
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
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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

      {/* Tabs for Different Views */}
      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validation">
            Validation ({personas.filter(p => p.validation_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({personas.filter(p => p.validation_status === 'approved' || p.validation_status === 'modified').length})
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
                            {persona.behaviors.map((behavior, idx) => (
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
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => validatePersona(persona.id, 'rejected')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => validatePersona(persona.id, 'approved')}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
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

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {personas.filter(p => p.validation_status === 'approved' || p.validation_status === 'modified').length === 0 ? (
            <Card className="p-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">No approved personas yet</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personas
                .filter(p => p.validation_status === 'approved' || p.validation_status === 'modified')
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
                        {persona.behaviors.slice(0, 3).map((behavior, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {behavior}
                          </Badge>
                        ))}
                        {persona.behaviors.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{persona.behaviors.length - 3}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* All Personas Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Similar structure to approved, but showing all */}
          <div className="text-center text-sm text-muted-foreground">
            Showing all {personas.length} personas
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {personas.filter(p => p.validation_status === 'approved' || p.validation_status === 'modified').length > 0 && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={saveAllPersonas}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save {personas.filter(p => p.validation_status === 'approved' || p.validation_status === 'modified').length} Validated Personas
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Persona</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the persona details below
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editingPersona && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingPersona.name}
                  onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingPersona.description}
                  onChange={(e) => setEditingPersona({ ...editingPersona, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Psychological Profile</Label>
                <Textarea
                  value={editingPersona.psychological_profile}
                  onChange={(e) => setEditingPersona({ ...editingPersona, psychological_profile: e.target.value })}
                />
              </div>

              <div>
                <Label>Behaviors (comma separated)</Label>
                <Textarea
                  value={editingPersona.behaviors.join(', ')}
                  onChange={(e) => setEditingPersona({
                    ...editingPersona,
                    behaviors: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                  })}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEditedPersona}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}