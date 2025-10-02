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
            console.log(`🔍 STARTING ANNOTATION PROCESSING`)
            console.log(`Processing annotation:`, pdfAnnot)
            console.log(`Available properties:`, Object.keys(pdfAnnot))
            
            // Log all properties with their values to see what's available
            console.log(`All annotation properties:`, {
              id: pdfAnnot.id,
              title: pdfAnnot.title,
              author: pdfAnnot.author,
              creator: pdfAnnot.creator,
              subject: pdfAnnot.subject,
              content: pdfAnnot.content,
              contentsObj: pdfAnnot.contentsObj,
              T: pdfAnnot.T,
              Subject: pdfAnnot.Subject,
              Title: pdfAnnot.Title,
              name: pdfAnnot.name,
              NM: pdfAnnot.NM,
              Contents: pdfAnnot.Contents
            })
            
            // Also log ALL properties dynamically to catch anything we missed
            console.log(`🔍 DYNAMIC PROPERTY INSPECTION:`, Object.keys(pdfAnnot).reduce((acc, key) => {
              acc[key] = pdfAnnot[key];
              return acc;
            }, {}))
            
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
            
            // Get QuadPoints for multi-line highlights - try different property names
            let quadPoints = pdfAnnot.quadPoints || pdfAnnot.QuadPoints || pdfAnnot.quadpoints
            console.log(`QuadPoints available:`, !!quadPoints)
            
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
            
            // Process QuadPoints if available (for multi-line highlights)
            let processedQuadPoints: number[][] | undefined
            let normalizedQuads: number[][] | undefined
            
            if (quadPoints && Array.isArray(quadPoints) && quadPoints.length > 0) {
              // QuadPoints come as flat array: [x1,y1,x2,y2,x3,y3,x4,y4, ...] for each quad
              // Group into quads of 8 values each, then convert Y coordinates
              processedQuadPoints = []
              normalizedQuads = []
              
              for (let i = 0; i < quadPoints.length; i += 8) {
                const quad = quadPoints.slice(i, i + 8)
                if (quad.length === 8) {
                  // Flip Y coordinates for each point in the quad
                  const flippedQuad = [
                    quad[0], pageSize.height - quad[1], // point 1
                    quad[2], pageSize.height - quad[3], // point 2
                    quad[4], pageSize.height - quad[5], // point 3
                    quad[6], pageSize.height - quad[7], // point 4
                  ]
                  processedQuadPoints.push(flippedQuad)
                  
                  // Normalize the quad points
                  const normalizedQuad = [
                    quad[0] / pageSize.width, quad[1] / pageSize.height,
                    quad[2] / pageSize.width, quad[3] / pageSize.height,
                    quad[4] / pageSize.width, quad[5] / pageSize.height,
                    quad[6] / pageSize.width, quad[7] / pageSize.height,
                  ]
                  normalizedQuads.push(normalizedQuad)
                }
              }
              console.log(`Processed ${processedQuadPoints.length} quads for multi-line highlight`)
            }
            
            // Try to get annotation title from various possible properties
            // Check for titleObj.str first (this is where PyMuPDF/fitz stores titles)
            let possibleTitle = (pdfAnnot.titleObj && pdfAnnot.titleObj.str) ||
                               pdfAnnot.content ||
                               (pdfAnnot.contentsObj && pdfAnnot.contentsObj.str) ||
                               pdfAnnot.title || 
                               pdfAnnot.author ||
                               pdfAnnot.creator ||
                               pdfAnnot.T || 
                               pdfAnnot.Subject || 
                               pdfAnnot.Title ||
                               pdfAnnot.name ||
                               undefined
            
            // Debug: Log annotation title extraction (can be removed in production)
            console.log(`Annotation title candidates:`, {
              titleObj: pdfAnnot.titleObj,
              content: pdfAnnot.content,
              contentsObj: pdfAnnot.contentsObj,
              title: pdfAnnot.title,
              author: pdfAnnot.author,
              creator: pdfAnnot.creator,
              subject: pdfAnnot.subject,
              T: pdfAnnot.T,
              Subject: pdfAnnot.Subject,
              Title: pdfAnnot.Title,
              name: pdfAnnot.name,
              selected: possibleTitle
            })

            // If no title found, use annotation type as fallback
            if (!possibleTitle) {
              possibleTitle = annotType.toLowerCase()
            }

            const annotation: Annotation = {
              annotation_id: pdfAnnot.id || `ann_${pageNumber}_${Date.now()}_${Math.random()}`,
              page: pageNumber,
              span_text: contents,
              entity_type: mapAnnotationTypeToEntityType(annotType),
              annotation_title: possibleTitle,
              feedback_type: 'unreviewed',
              bbox: bbox,
              normalized_bbox: normalizedBbox,
              pdf_annotation_type: annotType,
              pdf_annotation_id: pdfAnnot.id || '',
              quad_points: processedQuadPoints,
              normalized_quads: normalizedQuads,
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