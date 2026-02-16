'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Check,
  X,
  Edit,
  Bot,
  UserCheck,
  Trash2,
  MessageSquarePlus
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Persona, getDifficultyColor } from './types'
import { getStatusBadge } from './helpers'

interface PersonaCardProps {
  persona: Persona
  index: number
  onEdit: (persona: Persona) => void
  onDelete: (personaId: string) => void
  onValidate: (personaId: string) => void
  onReject: (personaId: string) => void
  onFeedback: (persona: Persona) => void
}

/**
 * PersonaCard - Individual persona card for pending validation tab
 * Displays detailed persona information with action buttons
 */
export function PersonaCard({
  persona,
  index,
  onEdit,
  onDelete,
  onValidate,
  onReject,
  onFeedback
}: PersonaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-2 border-yellow-500/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                {persona.created_by === 'ai' ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
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
                onClick={() => onDelete(persona.id)}
                title="Delete persona"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(persona)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFeedback(persona)}
                title="Add feedback"
              >
                <MessageSquarePlus className="w-4 h-4 mr-1" />
                Feedback
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => onReject(persona.id)}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => onValidate(persona.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                Validate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
