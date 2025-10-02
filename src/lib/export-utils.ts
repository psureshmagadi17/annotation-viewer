import { Annotation, PdfDocumentMeta } from '@/types'

// JSON Export Schema (matches PRD requirements)
export interface ExportData {
  file: string
  annotations: ExportAnnotation[]
  exported_at: string
  reviewer_id?: string
  review_date: string
}

export interface ExportAnnotation {
  id: string
  page: number
  entity_type: string
  highlight: string
  status: 'correct' | 'incorrect' | 'needs_edit'
  comment?: string
  bbox?: {
    x: number
    y: number
    w: number
    h: number
  }
  notes?: string
}

// Convert internal annotation format to export format
export function convertToExportFormat(
  annotations: Annotation[],
  pdfMeta: PdfDocumentMeta,
  reviewerId?: string
): ExportData {
  const exportAnnotations: ExportAnnotation[] = annotations.map(annotation => ({
    id: annotation.annotation_id,
    page: annotation.page,
    entity_type: annotation.entity_type,
    highlight: annotation.span_text,
    status: mapFeedbackTypeToStatus(annotation.feedback_type),
    comment: annotation.notes,
    bbox: annotation.bbox,
    notes: annotation.notes
  }))

  return {
    file: pdfMeta.file_name,
    annotations: exportAnnotations,
    exported_at: new Date().toISOString(),
    reviewer_id: reviewerId,
    review_date: new Date().toISOString()
  }
}

// Map internal feedback types to export status
function mapFeedbackTypeToStatus(feedbackType: string): 'correct' | 'incorrect' | 'needs_edit' {
  switch (feedbackType) {
    case 'true_positive':
      return 'correct'
    case 'false_positive':
      return 'incorrect'
    case 'false_negative':
      return 'needs_edit'
    default:
      return 'needs_edit'
  }
}

// JSON Export
export function exportToJson(
  annotations: Annotation[],
  pdfMeta: PdfDocumentMeta,
  reviewerId?: string
): string {
  const exportData = convertToExportFormat(annotations, pdfMeta, reviewerId)
  return JSON.stringify(exportData, null, 2)
}

// CSV Export - flattened version
export function exportToCsv(
  annotations: Annotation[],
  pdfMeta: PdfDocumentMeta,
  reviewerId?: string
): string {
  const exportData = convertToExportFormat(annotations, pdfMeta, reviewerId)
  
  // CSV headers
  const headers = [
    'file',
    'annotation_id',
    'page',
    'entity_type',
    'highlight_text',
    'status',
    'comment',
    'notes',
    'bbox_x',
    'bbox_y',
    'bbox_width',
    'bbox_height',
    'reviewer_id',
    'exported_at'
  ]

  // CSV rows
  const rows = exportData.annotations.map(annotation => [
    exportData.file,
    annotation.id,
    annotation.page,
    annotation.entity_type,
    `"${annotation.highlight.replace(/"/g, '""')}"`, // Escape quotes
    annotation.status,
    `"${annotation.comment?.replace(/"/g, '""') || ''}"`,
    `"${annotation.notes?.replace(/"/g, '""') || ''}"`,
    annotation.bbox?.x || '',
    annotation.bbox?.y || '',
    annotation.bbox?.w || '',
    annotation.bbox?.h || '',
    exportData.reviewer_id || '',
    exportData.exported_at
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

// Download utility
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  URL.revokeObjectURL(url)
}

// Generate filename with timestamp
export function generateFilename(
  baseName: string,
  extension: string,
  includeTimestamp: boolean = true
): string {
  const timestamp = includeTimestamp 
    ? `_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}`
    : ''
  
  return `${baseName.replace(/\.pdf$/i, '')}_feedback${timestamp}.${extension}`
}
