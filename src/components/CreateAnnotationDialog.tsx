import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import { usePdfStore } from '@/stores/pdfStore'
import { Annotation, BoundingBox, NormalizedBoundingBox } from '@/types'
import { cn } from '@/lib/utils'

interface CreateAnnotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialText?: string
  initialPage?: number
  initialBbox?: BoundingBox
  initialNormalizedBbox?: NormalizedBoundingBox
  initialQuadPoints?: number[][]
  initialNormalizedQuads?: number[][]
}

export const CreateAnnotationDialog: React.FC<CreateAnnotationDialogProps> = ({
  open,
  onOpenChange,
  initialText = '',
  initialPage,
  initialBbox,
  initialNormalizedBbox,
  initialQuadPoints,
  initialNormalizedQuads,
}) => {
  const { pdfMeta, viewerState, addUserAnnotation } = usePdfStore()
  
  const [text, setText] = useState(initialText)
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(initialPage || viewerState.current_page)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setText(initialText)
      setPage(initialPage || viewerState.current_page)
      setEntityType('')
      setNotes('')
      setErrors({})
    }
  }, [open, initialText, initialPage, viewerState.current_page])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!text.trim()) {
      newErrors.text = 'Text is required'
    }
    if (!entityType) {
      newErrors.entityType = 'Entity type is required'
    }
    if (!page || page < 1) {
      newErrors.page = 'Valid page number is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Create annotation
    const annotationData: Omit<Annotation, 'annotation_id' | 'is_user_created' | 'feedback_type'> = {
      page,
      span_text: text.trim(),
      entity_type: entityType,
      annotation_title: entityType,
      bbox: initialBbox,
      normalized_bbox: initialNormalizedBbox,
      quad_points: initialQuadPoints,
      normalized_quads: initialNormalizedQuads,
      notes: notes.trim() || undefined,
      pdf_annotation_type: 'Highlight',
    }

    addUserAnnotation(annotationData)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-lg p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Add Missing Annotation
          </Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Text Input */}
            <div>
              <Label htmlFor="text">Selected Text</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (errors.text) setErrors({ ...errors, text: '' })
                }}
                placeholder="Select text in PDF or type here..."
                className={cn(errors.text && 'border-destructive')}
                rows={3}
              />
              {errors.text && (
                <p className="text-sm text-destructive mt-1">{errors.text}</p>
              )}
            </div>

            {/* Entity Type */}
            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <Input
                id="entityType"
                type="text"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  if (errors.entityType) setErrors({ ...errors, entityType: '' })
                }}
                placeholder="Enter entity type..."
                className={cn(errors.entityType && 'border-destructive')}
              />
              {errors.entityType && (
                <p className="text-sm text-destructive mt-1">{errors.entityType}</p>
              )}
            </div>

            {/* Page Number */}
            <div>
              <Label htmlFor="page">Page Number</Label>
              <Input
                id="page"
                type="number"
                min={1}
                max={pdfMeta?.num_pages || 1}
                value={page}
                onChange={(e) => {
                  const pageNum = parseInt(e.target.value) || 1
                  setPage(pageNum)
                  if (errors.page) setErrors({ ...errors, page: '' })
                }}
                className={cn(errors.page && 'border-destructive')}
              />
              {errors.page && (
                <p className="text-sm text-destructive mt-1">{errors.page}</p>
              )}
              {pdfMeta && (
                <p className="text-xs text-muted-foreground mt-1">
                  Page {page} of {pdfMeta.num_pages}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Annotation
              </Button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
