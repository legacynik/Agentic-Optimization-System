'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  Users,
  Building2,
  Brain,
  Target,
  Shuffle,
  Plus,
  Copy,
  Check,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PersonaTemplate {
  id: string
  name: string
  description: string
  psychologicalProfile: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  behaviors: string[]
}

export function PersonaGenerator() {
  const [businessUrl, setBusinessUrl] = useState('')
  const [businessType, setBusinessType] = useState('medical')
  const [generatedPersonas, setGeneratedPersonas] = useState<PersonaTemplate[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set())

  // Predefined persona templates per business type
  const personaTemplates: Record<string, PersonaTemplate[]> = {
    medical: [
      {
        id: 'med-1',
        name: 'Paziente Ansioso',
        description: 'Prima visita, molto preoccupato per i sintomi',
        psychologicalProfile: 'Cerca rassicurazione continua, fa molte domande',
        category: 'Informativo',
        difficulty: 'easy',
        behaviors: ['Ripete le domande', 'Cerca conferme', 'Parla dei sintomi in dettaglio']
      },
      {
        id: 'med-2',
        name: 'Manager Impegnato',
        description: 'Ha poco tempo, vuole soluzioni rapide',
        psychologicalProfile: 'Impaziente, orientato ai risultati, poco tempo',
        category: 'Veloce',
        difficulty: 'hard',
        behaviors: ['Interrompe spesso', 'Vuole andare al punto', 'Controlla l\'orologio']
      },
      {
        id: 'med-3',
        name: 'Scettico Informato',
        description: 'Ha letto su internet, mette in dubbio tutto',
        psychologicalProfile: 'Diffidente, vuole prove, confronta informazioni',
        category: 'Challenger',
        difficulty: 'extreme',
        behaviors: ['Cita articoli online', 'Chiede credenziali', 'Confronta prezzi']
      }
    ],
    ecommerce: [
      {
        id: 'eco-1',
        name: 'Compratore Compulsivo',
        description: 'Pronto ad acquistare, cerca conferme',
        psychologicalProfile: 'Entusiasta, impulsivo, cerca validazione',
        category: 'Ready to Buy',
        difficulty: 'easy',
        behaviors: ['Chiede sconti', 'Vuole comprare subito', 'Chiede tempi di consegna']
      },
      {
        id: 'eco-2',
        name: 'Confrontatore Seriale',
        description: 'Compara prezzi e caratteristiche con competitors',
        psychologicalProfile: 'Analitico, metodico, cerca il miglior affare',
        category: 'Researcher',
        difficulty: 'medium',
        behaviors: ['Menziona competitors', 'Chiede dettagli tecnici', 'Vuole garanzie']
      }
    ]
  }

  const generatePersonas = async () => {
    setIsGenerating(true)

    // Simulate AI generation (replace with actual API call)
    setTimeout(() => {
      const basePersonas = personaTemplates[businessType] || []

      // Add statistical variations
      const variations = basePersonas.flatMap(persona => [
        persona,
        {
          ...persona,
          id: `${persona.id}-variant-1`,
          name: `${persona.name} (Variant)`,
          difficulty: persona.difficulty === 'easy' ? 'medium' : persona.difficulty,
          behaviors: [...persona.behaviors, 'Comportamento edge case']
        }
      ])

      setGeneratedPersonas(variations)
      setIsGenerating(false)
    }, 2000)
  }

  const handlePersonaToggle = (personaId: string) => {
    const newSelected = new Set(selectedPersonas)
    if (newSelected.has(personaId)) {
      newSelected.delete(personaId)
    } else {
      newSelected.add(personaId)
    }
    setSelectedPersonas(newSelected)
  }

  const deployPersonas = () => {
    // Here you would send selected personas to N8N workflow
    console.log('Deploying personas:', Array.from(selectedPersonas))
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-gradient-to-r from-purple-500/20 to-blue-500/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Persona Generator AI
          </CardTitle>
          <CardDescription>
            Genera automaticamente personas statisticamente rappresentative per testare i tuoi agenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="automatic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="automatic">Generazione Automatica</TabsTrigger>
              <TabsTrigger value="manual">Creazione Manuale</TabsTrigger>
            </TabsList>

            <TabsContent value="automatic" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business-url">Website del Business (opzionale)</Label>
                    <Input
                      id="business-url"
                      placeholder="https://esempio.com"
                      value={businessUrl}
                      onChange={(e) => setBusinessUrl(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="business-type">Tipo di Business</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Clinica Medica</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="b2b">B2B Sales</SelectItem>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="realestate">Real Estate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="business-context">Contesto Business (aiuta la generazione)</Label>
                  <Textarea
                    id="business-context"
                    placeholder="Es: Clinica dentistica premium a Milano, target 35-55 anni, servizi di implantologia..."
                    className="mt-1 h-20"
                  />
                </div>

                <Button
                  onClick={generatePersonas}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Genera Personas Statistiche
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Creazione manuale personas - Coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generated Personas Grid */}
      {generatedPersonas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Personas Generate ({generatedPersonas.length})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPersonas(new Set(generatedPersonas.map(p => p.id)))}
              >
                <Check className="w-4 h-4 mr-1" />
                Seleziona Tutte
              </Button>
              <Button
                size="sm"
                disabled={selectedPersonas.size === 0}
                onClick={deployPersonas}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Target className="w-4 h-4 mr-1" />
                Deploy {selectedPersonas.size} Personas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedPersonas.map((persona) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedPersonas.has(persona.id)
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => handlePersonaToggle(persona.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{persona.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {persona.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            persona.difficulty === 'easy' ? 'secondary' :
                            persona.difficulty === 'medium' ? 'default' :
                            persona.difficulty === 'hard' ? 'destructive' :
                            'outline'
                          }
                        >
                          {persona.difficulty}
                        </Badge>
                        {selectedPersonas.has(persona.id) && (
                          <Check className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Profilo Psicologico:</p>
                        <p className="text-xs">{persona.psychologicalProfile}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Comportamenti:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {persona.behaviors.map((behavior, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {behavior}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Statistical Coverage Indicator */}
      {generatedPersonas.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Copertura Statistica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Profili Base</p>
                <p className="font-bold text-lg">{personaTemplates[businessType]?.length || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Variazioni</p>
                <p className="font-bold text-lg">{generatedPersonas.length - (personaTemplates[businessType]?.length || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Edge Cases</p>
                <p className="font-bold text-lg">
                  {generatedPersonas.filter(p => p.difficulty === 'extreme').length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Coverage</p>
                <p className="font-bold text-lg text-green-600">
                  {((generatedPersonas.length / 10) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}