'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Persona } from './types'

interface PersonaEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingPersona: Persona | null
  setEditingPersona: (persona: Persona | null) => void
  onSave: () => void
}

/**
 * PersonaEditDialog - Dialog for creating/editing personas
 * Handles both new persona creation and existing persona updates
 */
export function PersonaEditDialog({
  open,
  onOpenChange,
  editingPersona,
  setEditingPersona,
  onSave
}: PersonaEditDialogProps) {
  if (!editingPersona) return null

  const isNew = editingPersona.id.startsWith('new-')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isNew ? 'Create Persona' : 'Edit Persona'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isNew
              ? 'Fill in the details for the new persona'
              : 'Modify the persona details below'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={editingPersona.name}
              onChange={(e) => setEditingPersona({
                ...editingPersona,
                name: e.target.value
              })}
              placeholder="Persona name"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={editingPersona.description || ''}
              onChange={(e) => setEditingPersona({
                ...editingPersona,
                description: e.target.value
              })}
              placeholder="Brief description of the persona"
            />
          </div>

          <div>
            <Label>Psychological Profile</Label>
            <Textarea
              value={editingPersona.psychological_profile || ''}
              onChange={(e) => setEditingPersona({
                ...editingPersona,
                psychological_profile: e.target.value
              })}
              placeholder="Detailed psychological traits and behavior patterns"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Input
                value={editingPersona.category || ''}
                onChange={(e) => setEditingPersona({
                  ...editingPersona,
                  category: e.target.value
                })}
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

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSave}>
            {isNew ? 'Create' : 'Save Changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
