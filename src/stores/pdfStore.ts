import { create } from 'zustand'
import { PdfDocumentMeta, ViewerState, Annotation } from '@/types'

interface PdfStore {
  // PDF document state
  pdfDocument: any | null
  pdfMeta: PdfDocumentMeta | null
  isLoading: boolean
  error: string | null
  
  // Viewer state
  viewerState: ViewerState
  
  // Annotations
  annotations: Annotation[]
  annotationsByPage: Record<number, Annotation[]>
  
  // Actions
  setPdfDocument: (document: any, meta: PdfDocumentMeta) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAnnotations: (annotations: Annotation[]) => void
  updateViewerState: (updates: Partial<ViewerState>) => void
  selectAnnotation: (annotationId: string) => void
  updateAnnotationFeedback: (annotationId: string, feedback: Partial<Pick<Annotation, 'feedback_type' | 'notes'>>) => void
  addUserAnnotation: (annotation: Omit<Annotation, 'annotation_id' | 'is_user_created' | 'feedback_type'>) => void
  deleteUserAnnotation: (annotationId: string) => void
  updateUserAnnotation: (annotationId: string, updates: Partial<Pick<Annotation, 'span_text' | 'entity_type' | 'notes'>>) => void
  clearPdf: () => void
}

export const usePdfStore = create<PdfStore>((set, get) => ({
  // Initial state
  pdfDocument: null,
  pdfMeta: null,
  isLoading: false,
  error: null,
  
  viewerState: {
    current_page: 1,
    current_annotation_id: undefined,
    scale: 1.0,
    is_sidebar_open: true,
    is_overlay_visible: true,
  },
  
  annotations: [],
  annotationsByPage: {},
  
  // Actions
  setPdfDocument: (document, meta) => {
    set({
      pdfDocument: document,
      pdfMeta: meta,
      error: null,
    })
  },
  
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  
  setError: (error) => {
    set({ error, isLoading: false })
  },
  
  setAnnotations: (annotations) => {
    // Group annotations by page for efficient lookup
    const annotationsByPage = annotations.reduce((acc, annotation) => {
      const page = annotation.page
      if (!acc[page]) {
        acc[page] = []
      }
      acc[page].push(annotation)
      return acc
    }, {} as Record<number, Annotation[]>)
    
    set({ annotations, annotationsByPage })
  },
  
  updateViewerState: (updates) => {
    set((state) => ({
      viewerState: { ...state.viewerState, ...updates }
    }))
  },
  
  selectAnnotation: (annotationId) => {
    const annotation = get().annotations.find(a => a.annotation_id === annotationId)
    if (annotation) {
      set((state) => ({
        viewerState: {
          ...state.viewerState,
          current_annotation_id: annotationId,
          current_page: annotation.page,
        }
      }))
    }
  },

  updateAnnotationFeedback: (annotationId, feedback) => {
    set((state) => {
      const updatedAnnotations = state.annotations.map(annotation => 
        annotation.annotation_id === annotationId
          ? { ...annotation, ...feedback }
          : annotation
      )

      // Update annotationsByPage as well
      const updatedAnnotationsByPage = { ...state.annotationsByPage }
      Object.keys(updatedAnnotationsByPage).forEach(page => {
        const pageNum = parseInt(page)
        updatedAnnotationsByPage[pageNum] = updatedAnnotations.filter(a => a.page === pageNum)
      })

      return {
        annotations: updatedAnnotations,
        annotationsByPage: updatedAnnotationsByPage
      }
    })
  },

  addUserAnnotation: (annotation) => {
    const annotationId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newAnnotation: Annotation = {
      ...annotation,
      annotation_id: annotationId,
      is_user_created: true,
      feedback_type: 'false_negative',
    }

    set((state) => {
      const updatedAnnotations = [...state.annotations, newAnnotation]
      
      // Update annotationsByPage
      const updatedAnnotationsByPage = { ...state.annotationsByPage }
      if (!updatedAnnotationsByPage[newAnnotation.page]) {
        updatedAnnotationsByPage[newAnnotation.page] = []
      }
      updatedAnnotationsByPage[newAnnotation.page].push(newAnnotation)

      return {
        annotations: updatedAnnotations,
        annotationsByPage: updatedAnnotationsByPage
      }
    })
  },

  deleteUserAnnotation: (annotationId) => {
    set((state) => {
      const annotation = state.annotations.find(a => a.annotation_id === annotationId)
      if (!annotation || !annotation.is_user_created) {
        return state // Only allow deletion of user-created annotations
      }

      const updatedAnnotations = state.annotations.filter(a => a.annotation_id !== annotationId)
      
      // Update annotationsByPage
      const updatedAnnotationsByPage = { ...state.annotationsByPage }
      if (updatedAnnotationsByPage[annotation.page]) {
        updatedAnnotationsByPage[annotation.page] = updatedAnnotationsByPage[annotation.page].filter(
          a => a.annotation_id !== annotationId
        )
      }

      return {
        annotations: updatedAnnotations,
        annotationsByPage: updatedAnnotationsByPage
      }
    })
  },

  updateUserAnnotation: (annotationId, updates) => {
    set((state) => {
      const annotation = state.annotations.find(a => a.annotation_id === annotationId)
      if (!annotation || !annotation.is_user_created) {
        return state // Only allow updates to user-created annotations
      }

      const updatedAnnotations = state.annotations.map(a => 
        a.annotation_id === annotationId
          ? { ...a, ...updates }
          : a
      )

      // Update annotationsByPage as well
      const updatedAnnotationsByPage = { ...state.annotationsByPage }
      Object.keys(updatedAnnotationsByPage).forEach(page => {
        const pageNum = parseInt(page)
        updatedAnnotationsByPage[pageNum] = updatedAnnotations.filter(a => a.page === pageNum)
      })

      return {
        annotations: updatedAnnotations,
        annotationsByPage: updatedAnnotationsByPage
      }
    })
  },
  
  clearPdf: () => {
    set({
      pdfDocument: null,
      pdfMeta: null,
      annotations: [],
      annotationsByPage: {},
      error: null,
      isLoading: false,
      viewerState: {
        current_page: 1,
        current_annotation_id: undefined,
        scale: 1.0,
        is_sidebar_open: true,
        is_overlay_visible: true,
      },
    })
  },
}))
