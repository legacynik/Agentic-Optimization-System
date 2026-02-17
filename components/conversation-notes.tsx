"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Bold, Italic, List, ListOrdered, Save, Loader2 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { updateConversationNotes } from '@/lib/queries'

interface ConversationNotesProps {
  conversationId: string
  initialNotes?: string
}

export function ConversationNotes({ conversationId, initialNotes = '' }: ConversationNotesProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add your notes about this conversation...',
      }),
    ],
    content: initialNotes,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }

      // Set new auto-save timer for 30 seconds
      const timer = setTimeout(() => {
        handleSave(true) // auto-save
      }, 30000)

      setAutoSaveTimer(timer)
    },
  })

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSaveTimer])

  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!editor) return

    const content = editor.getHTML()
    setIsSaving(true)

    try {
      await updateConversationNotes(conversationId, content)

      setLastSaved(new Date())

      if (!isAutoSave) {
        toast.success('Notes saved successfully', {
          description: 'Your notes have been saved to the database.',
        })
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('Failed to save notes', {
        description: error instanceof Error ? error.message : 'An error occurred while saving.',
      })
    } finally {
      setIsSaving(false)
    }
  }, [editor, conversationId])

  if (!editor) {
    return <div className="p-4 text-muted-foreground">Loading editor...</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Toggle bullet list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Toggle ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="flex-1" />

        {lastSaved && (
          <p className="text-xs text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}

        <Button
          onClick={() => handleSave(false)}
          disabled={isSaving}
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Editor */}
      <div className="border border-border rounded-md bg-background">
        <EditorContent editor={editor} />
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground">
        Notes auto-save after 30 seconds of inactivity. Click Save to save immediately.
      </p>
    </div>
  )
}
