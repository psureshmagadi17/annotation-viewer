// Annotation types based on schemas.md
export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface NormalizedBoundingBox {
  x: number // 0-1
  y: number // 0-1
  w: number // 0-1
  h: number // 0-1
}

export interface Annotation {
  annotation_id: string
  page: number
  span_text: string
  entity_type: string
  annotation_title?: string // Title/subject from PDF annotation properties
  feedback_type: 'true_positive' | 'false_positive' | 'false_negative' | 'unreviewed'
  bbox?: BoundingBox
  normalized_bbox?: NormalizedBoundingBox
  notes?: string
  pdf_annotation_type?: string // Original PDF annotation type (highlight, comment, etc.)
  pdf_annotation_id?: string // Original PDF annotation ID
  quad_points?: number[][] // For multi-line highlights: array of [x1,y1,x2,y2,x3,y3,x4,y4] quadrilaterals
  normalized_quads?: number[][] // Normalized quad points (0-1 range)
}

export interface FeedbackSession {
  file_id: string
  reviewer_id?: string
  review_date: string
  feedback: Annotation[]
}

// Internal state types
export interface PdfDocumentMeta {
  file_name: string
  num_pages: number
  fingerprint?: string
  annotations_extracted: boolean
}

export interface ViewerState {
  current_page: number
  current_annotation_id?: string
  scale: number
  is_sidebar_open: boolean
  is_overlay_visible: boolean
}

export interface FiltersState {
  entity_types: string[]
  statuses: string[]
  search_term: string
}

// PDF.js types
export interface PageViewport {
  width: number
  height: number
  scale: number
}

export interface PdfPage {
  pageNumber: number
  viewport: PageViewport
  canvas?: HTMLCanvasElement
}

// PDF annotation extraction types
export interface PdfAnnotationExtracted {
  id: string
  type: string
  pageNumber: number
  rect: BoundingBox
  contents?: string
  title?: string
  color?: string
  opacity?: number
  borderWidth?: number
  borderStyle?: string
  // Additional properties for different annotation types
  quads?: number[][]
  hasPopup?: boolean
  popupRect?: BoundingBox
}

export interface AnnotationExtractionResult {
  success: boolean
  annotations: Annotation[]
  errors?: string[]
  metadata: {
    total_annotations: number
    pages_with_annotations: number[]
    annotation_types: string[]
  }
}

// XFDF export types
export interface XfdfAnnotation {
  id: string
  page: number
  rect: BoundingBox
  contents: string
  type: string
  color?: string
  opacity?: number
}
