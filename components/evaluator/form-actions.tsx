import { Button } from "@/components/ui/button"
import { Save, X } from "lucide-react"

interface FormActionsProps {
  isEditing: boolean
  isLoading: boolean
  error?: string
  onCancel: () => void
}

export function FormActions({
  isEditing,
  isLoading,
  error,
  onCancel,
}: FormActionsProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2 ml-auto">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  )
}
