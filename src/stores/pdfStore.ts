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
