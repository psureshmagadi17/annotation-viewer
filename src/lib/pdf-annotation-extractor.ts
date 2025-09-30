import { Annotation, AnnotationExtractionResult, BoundingBox, NormalizedBoundingBox } from '@/types'
import { normalizeCoordinates } from './utils'

/**
 * Extract annotations from a PDF document using PDF.js
 * This replaces the pdf-lib approach with PDF.js's built-in getAnnotations() method
 */
export async function extractAnnotationsFromPdfJs(
  pdfDocument: any,
  fileName: string
): Promise<AnnotationExtractionResult> {
  try {
    console.log('🔍 Starting annotation extraction from PDF using PDF.js...')
    
    const annotations: Annotation[] = []
    const errors: string[] = []
    const pagesWithAnnotations = new Set<number>()
    const annotationTypes = new Set<string>()
    
    const numPages = pdfDocument.numPages
    
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      console.log(`\n📄 Processing Page ${pageNumber}...`)
      
      try {
        // Get the page
        const page = await pdfDocument.getPage(pageNumber)
        const pageSize = page.getViewport({ scale: 1.0 })
        
        // Use PDF.js built-in getAnnotations() method
        const pdfAnnotations = await page.getAnnotations()
        
        console.log(`Page ${pageNumber} annotations found:`, pdfAnnotations.length)
        
        if (pdfAnnotations.length === 0) {
          console.log(`❌ Page ${pageNumber} - No annotations found`)
          continue
        }
        
        console.log(`✓ Page ${pageNumber} has ${pdfAnnotations.length} annotations to process`)
        
        // Process each annotation
        for (const pdfAnnot of pdfAnnotations) {
          try {
            console.log(`Processing annotation:`, pdfAnnot)
            
            const annotType = pdfAnnot.subtype || 'Unknown'
            console.log(`Annotation type: ${annotType}`)
            
            // Skip Popup annotations - they are associated with highlights/comments but not the content itself
            if (annotType === 'Popup') {
              console.log(`⏭️  Skipping Popup annotation (associated with parent annotation)`)
              continue
            }
            
            // Skip Link annotations (navigation links, not user annotations)
            if (annotType === 'Link') {
              console.log(`⏭️  Skipping Link annotation (navigation only)`)
              continue
            }
            
            // Get rectangle coordinates
            let rect = pdfAnnot.rect || [0, 0, 0, 0]
            console.log(`Rectangle: ${rect}`)
            
            // Convert PDF coordinates to our format
            // PDF.js already gives us coordinates in page space, but we need to handle bottom-left origin
            const [x1, y1, x2, y2] = rect
            const bbox: BoundingBox = {
              x: Math.min(x1, x2),
              y: pageSize.height - Math.max(y1, y2), // Flip Y coordinate
              w: Math.abs(x2 - x1),
              h: Math.abs(y2 - y1),
            }
            
            // Get annotation content/text
            const contents = pdfAnnot.contents || ''
            console.log(`Contents: ${contents}`)
            
            // Normalize bbox
            const normalizedBbox = normalizeCoordinates(bbox, pageSize.width, pageSize.height)
            
            const annotation: Annotation = {
              annotation_id: pdfAnnot.id || `ann_${pageNumber}_${Date.now()}_${Math.random()}`,
              page: pageNumber,
              span_text: contents,
              entity_type: mapAnnotationTypeToEntityType(annotType),
              feedback_type: 'unreviewed',
              bbox: bbox,
              normalized_bbox: normalizedBbox,
              pdf_annotation_type: annotType,
              pdf_annotation_id: pdfAnnot.id || '',
            }
            
            annotations.push(annotation)
            pagesWithAnnotations.add(pageNumber)
            annotationTypes.add(annotType)
            console.log(`✅ Extracted annotation: ${annotType} on page ${pageNumber}`)
          } catch (annotError) {
            console.error(`Error processing annotation on page ${pageNumber}:`, annotError)
            errors.push(`Error processing annotation on page ${pageNumber}: ${annotError}`)
          }
        }
      } catch (pageError) {
        console.error(`Error processing page ${pageNumber}:`, pageError)
        errors.push(`Error processing page ${pageNumber}: ${pageError}`)
      }
    }
    
    console.log('\n✅ Annotation extraction complete!')
    console.log(`Total annotations: ${annotations.length}`)
    console.log(`Pages with annotations: ${Array.from(pagesWithAnnotations).join(', ')}`)
    console.log(`Annotation types: ${Array.from(annotationTypes).join(', ')}`)
    
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
    console.error('Failed to extract annotations:', error)
    return {
      success: false,
      annotations: [],
      errors: [`Failed to extract annotations: ${error}`],
      metadata: {
        total_annotations: 0,
        pages_with_annotations: [],
        annotation_types: [],
      },
    }
  }
}

/**
 * Map PDF annotation types to entity types for our schema
 */
function mapAnnotationTypeToEntityType(pdfType: string): string {
  const typeMap: Record<string, string> = {
    'Highlight': 'highlight',
    'Underline': 'underline',
    'StrikeOut': 'strikeout',
    'Squiggly': 'squiggly',
    'Text': 'comment',
    'FreeText': 'freetext',
    'Square': 'square',
    'Circle': 'circle',
    'Polygon': 'polygon',
    'PolyLine': 'polyline',
    'Line': 'line',
    'Ink': 'ink',
    'Stamp': 'stamp',
    'Caret': 'caret',
    'FileAttachment': 'file',
  }
  
  return typeMap[pdfType] || pdfType.toLowerCase()
}