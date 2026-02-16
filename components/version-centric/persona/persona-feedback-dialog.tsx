'use client'

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
import { AlertCircle, Loader2 } from 'lucide-react'
import { Persona } from './types'

interface PersonaFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedbackPersona: Persona | null
  feedbackText: string
  feedbackCategory: 'behavior' | 'difficulty' | 'realism' | 'other'
  setFeedbackText: (text: string) => void
  setFeedbackCategory: (category: 'behavior' | 'difficulty' | 'realism' | 'other') => void
  onSubmit: () => void
  isSubmitting: boolean
}

/**
 * PersonaFeedbackDialog - Dialog for submitting feedback on personas
 * Allows categorization and detailed feedback submission
 */
export function PersonaFeedbackDialog({
  open,
  onOpenChange,
  feedbackPersona,
  feedbackText,
  feedbackCategory,
  setFeedbackText,
  setFeedbackCategory,
  onSubmit,
  isSubmitting
}: PersonaFeedbackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Add Feedback for {feedbackPersona?.name}
          </AlertDialogTitle>
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
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onSubmit}
            disabled={isSubmitting || !feedbackText.trim()}
          >
            {isSubmitting ? (
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
  )
}
