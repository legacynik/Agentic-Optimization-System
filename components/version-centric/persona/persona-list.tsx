'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  UserCheck,
  Users,
  Edit,
  MessageSquarePlus,
  ShieldCheck,
  XCircle
} from 'lucide-react'
import { PersonaCard } from './persona-card'
import { Persona, getDifficultyColor } from './types'
import { getStatusBadge, getValidationScoreDisplay } from './helpers'

interface PersonaListProps {
  personas: Persona[]
  onEdit: (persona: Persona) => void
  onDelete: (personaId: string) => void
  onValidate: (personaId: string) => void
  onReject: (personaId: string) => void
  onFeedback: (persona: Persona) => void
  onGenerate: () => void
  onLlmValidate?: (personaId: string) => void
  onApproveOverride?: (personaId: string) => void
}

/**
 * PersonaList - Tabbed view for personas (Pending, Validated, All)
 * Renders different card layouts for each tab
 */
export function PersonaList({
  personas,
  onEdit,
  onDelete,
  onValidate,
  onReject,
  onFeedback,
  onGenerate,
  onLlmValidate,
  onApproveOverride
}: PersonaListProps) {
  const pendingPersonas = personas.filter(p => p.validation_status === 'pending_validation')
  const validatedPersonas = personas.filter(p => p.validation_status === 'validated' || p.validation_status === 'approved_override')
  const rejectedPersonas = personas.filter(p => p.validation_status === 'rejected')

  return (
    <Tabs defaultValue="validation" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="validation">
          Pending ({pendingPersonas.length})
        </TabsTrigger>
        <TabsTrigger value="validated">
          Validated ({validatedPersonas.length})
        </TabsTrigger>
        <TabsTrigger value="rejected">
          Rejected ({rejectedPersonas.length})
        </TabsTrigger>
        <TabsTrigger value="all">
          All ({personas.length})
        </TabsTrigger>
      </TabsList>

      {/* Pending Validation Tab */}
      <TabsContent value="validation" className="space-y-4">
        {pendingPersonas.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">No personas pending validation</p>
            <Button
              onClick={onGenerate}
              className="mt-4"
              variant="outline"
            >
              Generate Personas
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingPersonas.map((persona, idx) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                index={idx}
                onEdit={onEdit}
                onDelete={onDelete}
                onValidate={onValidate}
                onReject={onReject}
                onFeedback={onFeedback}
                onLlmValidate={onLlmValidate}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Validated Tab */}
      <TabsContent value="validated" className="space-y-4">
        {validatedPersonas.length === 0 ? (
          <Card className="p-12 text-center">
            <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">No validated personas yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Validate personas from the Pending tab to see them here
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {validatedPersonas.map((persona) => (
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
                      onClick={() => onFeedback(persona)}
                    >
                      <MessageSquarePlus className="w-4 h-4 mr-1" />
                      Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(persona)}
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

      {/* Rejected Tab */}
      <TabsContent value="rejected" className="space-y-4">
        {rejectedPersonas.length === 0 ? (
          <Card className="p-12 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">No rejected personas</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rejectedPersonas.map((persona) => (
              <Card key={persona.id} className="border-red-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{persona.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getValidationScoreDisplay(persona.validation_score)}
                      {getStatusBadge(persona)}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {persona.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {persona.rejection_reason && (
                    <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
                      <span className="font-medium">Rejection reason:</span> {persona.rejection_reason}
                    </div>
                  )}
                  {persona.validation_details && (
                    <div className="flex gap-3 mb-3 text-xs">
                      <span>Naturalness: <strong>{persona.validation_details.naturalness}</strong></span>
                      <span>Coherence: <strong>{persona.validation_details.coherence}</strong></span>
                      <span>Testability: <strong>{persona.validation_details.testability}</strong></span>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => onEdit(persona)}>
                      <Edit className="w-4 h-4 mr-1" />Edit & Re-validate
                    </Button>
                    {onApproveOverride && (
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => onApproveOverride(persona.id)}
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Approve Override
                      </Button>
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
              <Card
                key={persona.id}
                className={
                  persona.validation_status === 'validated' ? 'border-green-500/20'
                    : persona.validation_status === 'rejected' ? 'border-red-500/20'
                    : persona.validation_status === 'approved_override' ? 'border-blue-500/20'
                    : 'border-yellow-500/20'
                }
              >
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
                      {persona.created_by === 'ai' && '🤖 AI'}
                      {persona.created_by === 'template' && '📋 Template'}
                      {persona.created_by === 'human' && '👤 Human'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
