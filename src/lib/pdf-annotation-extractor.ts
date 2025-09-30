import { PDFDocument, PDFPage, PDFAnnotation } from 'pdf-lib'
import { Annotation, PdfAnnotationExtracted, AnnotationExtractionResult, BoundingBox, NormalizedBoundingBox } from '@/types'

/**
 * Extract annotations from a PDF document using pdf-lib
 */
export async function extractAnnotationsFromPdf(
  pdfBytes: Uint8Array,
  fileName: string
): Promise<AnnotationExtractionResult> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const annotations: Annotation[] = []
    const errors: string[] = []
    const pagesWithAnnotations = new Set<number>()
    const annotationTypes = new Set<string>()

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex]
      const pageNumber = pageIndex + 1
      const pageSize = page.getSize()
      
      try {
        const pageAnnotations = page.node.Annots || []
        
        for (const annotationRef of pageAnnotations) {
          try {
            const annotation = pdfDoc.context.lookup(annotationRef)
            const extracted = await extractSingleAnnotation(annotation, pageNumber, pageSize)
            
            if (extracted) {
              const normalizedBbox = normalizeCoordinates(extracted.rect, pageSize.width, pageSize.height)
              
              const annotation: Annotation = {
                annotation_id: extracted.id,
                page: pageNumber,
                span_text: extracted.contents || '',
                entity_type: mapAnnotationTypeToEntityType(extracted.type),
                feedback_type: 'unreviewed',
                bbox: extracted.rect,
                normalized_bbox: normalizedBbox,
                pdf_annotation_type: extracted.type,
                pdf_annotation_id: extracted.id,
              }
              
              annotations.push(annotation)
              pagesWithAnnotations.add(pageNumber)
              annotationTypes.add(extracted.type)
            }
          } catch (annotationError) {
            errors.push(`Error processing annotation on page ${pageNumber}: ${annotationError}`)
          }
        }
      } catch (pageError) {
        errors.push(`Error processing page ${pageNumber}: ${pageError}`)
      }
    }

    return {
      success: true,
      annotations,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        total_annotations: annotations.length,
        pages_with_annotations: Array.from(pagesWithAnnotations).sort((a, b) => a - b),
        annotation_types: Array.from(annotationTypes),
      },
    }
  } catch (error) {
    return {
      success: false,
      annotations: [],
      errors: [`Failed to load PDF: ${error}`],
      metadata: {
        total_annotations: 0,
        pages_with_annotations: [],
        annotation_types: [],
      },
    }
  }
}

/**
 * Extract a single annotation from pdf-lib annotation object
 */
async function extractSingleAnnotation(
  annotation: any,
  pageNumber: number,
  pageSize: { width: number; height: number }
): Promise<PdfAnnotationExtracted | null> {
  try {
    const type = annotation.Subtype?.name || 'Unknown'
    const rect = annotation.Rect || [0, 0, 0, 0]
    const contents = annotation.Contents?.toString() || ''
    const title = annotation.T?.toString() || ''
    const color = annotation.C ? `rgb(${annotation.C.join(',')})` : undefined
    const opacity = annotation.CA || 1
    const borderWidth = annotation.BS?.W || annotation.Border?.[3] || 1
    const borderStyle = annotation.BS?.S?.name || 'Solid'

    // Convert PDF coordinates (bottom-left origin) to top-left origin
    const [x1, y1, x2, y2] = rect
    const bbox: BoundingBox = {
      x: Math.min(x1, x2),
      y: pageSize.height - Math.max(y1, y2), // Flip Y coordinate
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    }

    return {
      id: annotation.ref?.toString() || `ann_${Date.now()}_${Math.random()}`,
      type,
      pageNumber,
      rect: bbox,
      contents,
      title,
      color,
      opacity,
      borderWidth,
      borderStyle,
    }
  } catch (error) {
    console.warn('Error extracting single annotation:', error)
    return null
  }
}

/**
 * Map PDF annotation types to entity types for our schema
 */
function mapAnnotationTypeToEntityType(pdfType: string): string {
  const typeMap: Record<string, string> = {
    'Highlight': 'Highlight',
    'Underline': 'Underline',
    'Squiggly': 'Squiggly',
    'StrikeOut': 'StrikeOut',
    'FreeText': 'Text',
    'Note': 'Note',
    'Square': 'Rectangle',
    'Circle': 'Circle',
    'Line': 'Line',
    'Polygon': 'Polygon',
    'Ink': 'Ink',
    'Stamp': 'Stamp',
  }
  
  return typeMap[pdfType] || 'Unknown'
}

/**
 * Normalize coordinates to 0-1 range
 */
function normalizeCoordinates(
  bbox: BoundingBox,
  pageWidth: number,
  pageHeight: number
): NormalizedBoundingBox {
  return {
    x: bbox.x / pageWidth,
    y: bbox.y / pageHeight,
    w: bbox.w / pageWidth,
    h: bbox.h / pageHeight,
  }
}

/**
 * Denormalize coordinates back to PDF units
 */
export function denormalizeCoordinates(
  normalizedBbox: NormalizedBoundingBox,
  pageWidth: number,
  pageHeight: number
): BoundingBox {
  return {
    x: normalizedBbox.x * pageWidth,
    y: normalizedBbox.y * pageHeight,
    w: normalizedBbox.w * pageWidth,
    h: normalizedBbox.h * pageHeight,
  }
}
