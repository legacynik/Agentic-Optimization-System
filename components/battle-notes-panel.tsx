"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Loader2, MessageSquarePlus, Trash2 } from "lucide-react"
import {
  useBattleNotes,
  useCreateBattleNote,
  useDeleteBattleNote,
  NOTE_CATEGORIES,
  NoteCategory,
  BattleNote,
} from "@/hooks/use-battle-notes"

interface BattleNotesPanelProps {
  battleResultId: string
  readOnly?: boolean
}

/**
 * Battle Notes Panel
 * Per PRD 10.4: List notes, form with category selector
 */
export function BattleNotesPanel({
  battleResultId,
  readOnly = false,
}: BattleNotesPanelProps) {
  const { data: notes, isLoading, error } = useBattleNotes(battleResultId)
  const createMutation = useCreateBattleNote()
  const deleteMutation = useDeleteBattleNote()

  const [noteText, setNoteText] = useState("")
  const [category, setCategory] = useState<NoteCategory>("suggestion")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return

    await createMutation.mutateAsync({
      battle_result_id: battleResultId,
      note: noteText.trim(),
      category,
    })

    setNoteText("")
    setCategory("suggestion")
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return
    await deleteMutation.mutateAsync(noteId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-2 py-4 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load notes</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquarePlus className="h-4 w-4" />
          Battle Notes
          {notes && notes.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notes List - Per PRD 10.4 */}
        <BattleNotesList
          notes={notes || []}
          onDelete={readOnly ? undefined : handleDelete}
          isDeleting={deleteMutation.isPending}
        />

        {/* Note Form - Per PRD 10.4 */}
        {!readOnly && (
          <>
            {notes && notes.length > 0 && <Separator />}
            <BattleNoteForm
              noteText={noteText}
              category={category}
              onNoteChange={setNoteText}
              onCategoryChange={setCategory}
              onSubmit={handleSubmit}
              isSubmitting={createMutation.isPending}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Notes List Component
 */
function BattleNotesList({
  notes,
  onDelete,
  isDeleting,
}: {
  notes: BattleNote[]
  onDelete?: (id: string) => void
  isDeleting?: boolean
}) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No notes yet. Add one below.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const categoryConfig = NOTE_CATEGORIES.find((c) => c.value === note.category)
        return (
          <div
            key={note.id}
            className="group flex items-start gap-3 rounded-lg border p-3"
          >
            <span className="text-lg" title={categoryConfig?.label}>
              {categoryConfig?.emoji || "📝"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm whitespace-pre-wrap">{note.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(note.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Note Form Component
 * Per PRD 10.4: Textarea + category selector + submit button
 */
function BattleNoteForm({
  noteText,
  category,
  onNoteChange,
  onCategoryChange,
  onSubmit,
  isSubmitting,
}: {
  noteText: string
  category: NoteCategory
  onNoteChange: (text: string) => void
  onCategoryChange: (category: NoteCategory) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        placeholder="Add a note about this conversation..."
        value={noteText}
        onChange={(e) => onNoteChange(e.target.value)}
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between gap-3">
        <Select
          value={category}
          onValueChange={(v) => onCategoryChange(v as NoteCategory)}
          disabled={isSubmitting}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" disabled={!noteText.trim() || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="mr-2 h-4 w-4" />
          )}
          Add Note
        </Button>
      </div>
    </form>
  )
}
