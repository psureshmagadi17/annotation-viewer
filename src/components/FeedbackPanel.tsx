import React, { useState, useEffect, useRef } from 'react'
import { usePdfStore } from '@/stores/pdfStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Edit,
  PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackPanelProps {
  className?: string
}

const STATUS_OPTIONS = [
  {
    value: 'true_positive',
    label: 'Correct',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Annotation is accurate and correct'
  },
  {
    value: 'false_positive',
    label: 'Incorrect',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Annotation is wrong or inaccurate'
  },
  {
    value: 'false_negative',
    label: 'Needs Edit',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Annotation needs modification or clarification'
  }
]

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ className }) => {
  const {
    annotations,
    viewerState,
    updateViewerState,
    selectAnnotation,
    updateAnnotationFeedback,
    updateUserAnnotation,
    deleteUserAnnotation,
  } = usePdfStore()

  const [notes, setNotes] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('unreviewed')
  const [editableText, setEditableText] = useState('')
  const [editableEntityType, setEditableEntityType] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Get current annotation
  const currentAnnotation = annotations.find(
    a => a.annotation_id === viewerState.current_annotation_id
  )

  // Update local state when annotation changes
  useEffect(() => {
    if (currentAnnotation) {
      setSelectedStatus(currentAnnotation.feedback_type)
      setNotes(currentAnnotation.notes || '')
      setEditableText(currentAnnotation.span_text)
      setEditableEntityType(currentAnnotation.entity_type)
      setIsEditing(false)
      setHasUnsavedChanges(false)
      
      // Auto-focus notes textarea after a short delay
      setTimeout(() => {
        notesTextareaRef.current?.focus()
      }, 100)
    }
  }, [currentAnnotation])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when feedback panel is open
      if (!currentAnnotation) return

      // Prevent default for our shortcuts
      if (event.key === '1' || event.key === '2' || event.key === '3') {
        event.preventDefault()
        const statusMap = {
          '1': 'true_positive',
          '2': 'false_positive', 
          '3': 'false_negative'
        }
        handleStatusChange(statusMap[event.key as keyof typeof statusMap])
      }

      // Arrow keys for navigation
      if (event.key === 'ArrowLeft' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        handlePreviousAnnotation()
      }
      
      if (event.key === 'ArrowRight' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        handleNextAnnotation()
      }

      // Escape to close panel
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClosePanel()
      }

      // Save with Cmd/Ctrl + S
      if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (hasUnsavedChanges) {
          handleSaveFeedback()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentAnnotation, hasUnsavedChanges])

  // Handle status change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status)
    setHasUnsavedChanges(true)
  }

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasUnsavedChanges(true)
  }

  // Save feedback
  const handleSaveFeedback = () => {
    if (!currentAnnotation) return

    if (currentAnnotation.is_user_created && isEditing) {
      // Update user-created annotation text and entity type
      updateUserAnnotation(currentAnnotation.annotation_id, {
        span_text: editableText.trim(),
        entity_type: editableEntityType,
        notes: notes.trim() || undefined
      })
      setIsEditing(false)
    }
    
    // Always update status and notes (works for both extracted and user-created)
    updateAnnotationFeedback(currentAnnotation.annotation_id, {
      feedback_type: selectedStatus as any,
      notes: notes.trim() || undefined
    })

    setHasUnsavedChanges(false)
  }

  // Handle delete for user-created annotations
  const handleDelete = () => {
    if (!currentAnnotation || !currentAnnotation.is_user_created) return
    
    if (confirm('Are you sure you want to delete this annotation?')) {
      deleteUserAnnotation(currentAnnotation.annotation_id)
      handleClosePanel()
    }
  }

  // Handle text edit change
  const handleTextChange = (value: string) => {
    setEditableText(value)
    setHasUnsavedChanges(true)
  }

  // Handle entity type edit change
  const handleEntityTypeChange = (value: string) => {
    setEditableEntityType(value)
    setHasUnsavedChanges(true)
  }

  // Navigate to previous/next annotation
  const handlePreviousAnnotation = () => {
    if (!currentAnnotation) return
    
    const currentIndex = annotations.findIndex(
      a => a.annotation_id === currentAnnotation.annotation_id
    )
    
    if (currentIndex > 0) {
      selectAnnotation(annotations[currentIndex - 1].annotation_id)
    }
  }

  const handleNextAnnotation = () => {
    if (!currentAnnotation) return
    
    const currentIndex = annotations.findIndex(
      a => a.annotation_id === currentAnnotation.annotation_id
    )
    
    if (currentIndex < annotations.length - 1) {
      selectAnnotation(annotations[currentIndex + 1].annotation_id)
    }
  }

  // Close feedback panel
  const handleClosePanel = () => {
    updateViewerState({ current_annotation_id: undefined })
  }

  // If no annotation is selected, don't render
  if (!currentAnnotation) {
    return null
  }

  const currentIndex = annotations.findIndex(
    a => a.annotation_id === currentAnnotation.annotation_id
  ) + 1

  return (
    <div className={cn(
      "w-96 bg-card border-l border-border flex flex-col h-full",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Feedback</h3>
            <span className="text-sm text-muted-foreground">
              {currentIndex} of {annotations.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClosePanel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousAnnotation}
            disabled={currentIndex <= 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextAnnotation}
            disabled={currentIndex >= annotations.length}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Annotation Preview */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentAnnotation.is_user_created && (
                <PlusCircle className="w-4 h-4 text-orange-600" />
              )}
              <span className="text-sm font-medium text-primary">
                {currentAnnotation.is_user_created && isEditing ? (
                  <select
                    value={editableEntityType}
                    onChange={(e) => handleEntityTypeChange(e.target.value)}
                    className="px-2 py-1 text-sm border border-input rounded bg-background"
                  >
                    <option value="dx">dx</option>
                    <option value="evidence">evidence</option>
                    <option value="treatment">treatment</option>
                    <option value="symptom">symptom</option>
                    <option value="diagnosis">diagnosis</option>
                    <option value="medication">medication</option>
                    <option value="procedure">procedure</option>
                    <option value="condition">condition</option>
                    <option value="highlight">highlight</option>
                    <option value="other">other</option>
                  </select>
                ) : (
                  currentAnnotation.annotation_title || currentAnnotation.entity_type
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentAnnotation.is_user_created && (
                <>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        setEditableText(currentAnnotation.span_text)
                        setEditableEntityType(currentAnnotation.entity_type)
                        setHasUnsavedChanges(false)
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
              <span className="text-xs text-muted-foreground">
                Page {currentAnnotation.page}
              </span>
            </div>
          </div>
          {isEditing && currentAnnotation.is_user_created ? (
            <Textarea
              value={editableText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              rows={3}
            />
          ) : (
            <div className="text-sm text-foreground bg-background p-3 rounded border">
              {currentAnnotation.span_text}
            </div>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Status</h4>
          <div className="text-xs text-muted-foreground">
            Press 1, 2, or 3
          </div>
        </div>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = selectedStatus === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left",
                  isSelected
                    ? `${option.bgColor} ${option.borderColor} border-opacity-100`
                    : "border-border hover:border-border/80 hover:bg-accent/50"
                )}
              >
                <Icon className={cn("w-5 h-5", option.color)} />
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {option.label}
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {STATUS_OPTIONS.indexOf(option) + 1}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
                {isSelected && (
                  <div className={cn("w-2 h-2 rounded-full", option.color.replace('text-', 'bg-'))} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="p-4 border-b border-border flex-1">
        <h4 className="text-sm font-medium mb-3">Notes</h4>
        <Textarea
          ref={notesTextareaRef}
          placeholder="Add any additional comments or feedback..."
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="min-h-[120px] resize-none"
          rows={5}
        />
        <div className="text-xs text-muted-foreground mt-2">
          {notes.length} characters
        </div>
      </div>

      {/* Footer with Save */}
      <div className="p-4 border-t border-border bg-muted/30">
        {hasUnsavedChanges && (
          <div className="text-xs text-orange-600 mb-3 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            You have unsaved changes
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Cmd+S to save • Esc to close
          </div>
          <Button
            onClick={handleSaveFeedback}
            disabled={!hasUnsavedChanges}
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
