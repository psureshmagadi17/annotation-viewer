import { BoundingBox, NormalizedBoundingBox } from '@/types'

export interface TextSelection {
  text: string
  bbox: BoundingBox
  normalizedBbox: NormalizedBoundingBox
  pageNumber: number
  quadPoints?: number[][]
  normalizedQuads?: number[][]
}

/**
 * Calculate bounding box from selection coordinates
 */
export function calculateBboxFromSelection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  pageWidth: number,
  pageHeight: number
): BoundingBox {
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const w = Math.abs(endX - startX)
  const h = Math.abs(endY - startY)
  
  return { x, y, w, h }
}

/**
 * Normalize bounding box coordinates to 0-1 range
 */
export function normalizeBbox(
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
 * Get text content from PDF.js text layer
 */
export async function getTextFromSelection(
  pdfPage: any,
  viewport: any,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Promise<TextSelection | null> {
  try {
    const textContent = await pdfPage.getTextContent()
    const pageWidth = viewport.width
    const pageHeight = viewport.height
    
    // Convert canvas coordinates to PDF coordinates
    const scale = viewport.scale
    
    // Get text items that intersect with selection rectangle
    const selectedText: string[] = []
    const textItems: Array<{ x: number; y: number; width: number; height: number; str: string }> = []
    
    const selectionLeft = Math.min(startX, endX)
    const selectionRight = Math.max(startX, endX)
    const selectionTop = Math.min(startY, endY)
    const selectionBottom = Math.max(startY, endY)
    
    // Transform text items to viewport coordinates
    for (const item of textContent.items) {
      if (!item.str || item.str.trim() === '') continue
      
      const tx = item.transform
      const x = tx[4]
      const y = viewport.height - tx[5] // PDF coordinates are bottom-up
      const width = item.width || 0
      const height = item.height || 0
      
      // Check if text item intersects with selection
      const itemRight = x + width
      const itemBottom = y + height
      
      if (
        x < selectionRight &&
        itemRight > selectionLeft &&
        y < selectionBottom &&
        itemBottom > selectionTop
      ) {
        selectedText.push(item.str)
        textItems.push({ x, y, width, height, str: item.str })
      }
    }
    
    if (selectedText.length === 0) {
      return null
    }
    
    // Calculate bounding box from selected text items
    const allX = textItems.flatMap(item => [item.x, item.x + item.width])
    const allY = textItems.flatMap(item => [item.y, item.y + item.height])
    
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    
    const bbox: BoundingBox = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    }
    
    const normalizedBbox = normalizeBbox(bbox, pageWidth, pageHeight)
    
    // Create quad points for multi-line selections
    const quadPoints: number[][] = []
    if (textItems.length > 1) {
      // Group text items by line (similar Y coordinates)
      const lines: typeof textItems[][] = []
      textItems.forEach(item => {
        const lineIndex = lines.findIndex(line => 
          Math.abs(line[0].y - item.y) < 5 // Within 5px = same line
        )
        if (lineIndex >= 0) {
          lines[lineIndex].push(item)
        } else {
          lines.push([item])
        }
      })
      
      // Create quad for each line
      lines.forEach(line => {
        const lineX = Math.min(...line.map(i => i.x))
        const lineY = Math.min(...line.map(i => i.y))
        const lineRight = Math.max(...line.map(i => i.x + i.width))
        const lineBottom = Math.max(...line.map(i => i.y + i.height))
        
        // Quad format: [x1,y1, x2,y2, x3,y3, x4,y4]
        quadPoints.push([
          lineX, lineY,
          lineRight, lineY,
          lineRight, lineBottom,
          lineX, lineBottom
        ])
      })
    }
    
    const normalizedQuads = quadPoints.length > 0
      ? quadPoints.map(quad => [
          quad[0] / pageWidth, quad[1] / pageHeight,
          quad[2] / pageWidth, quad[3] / pageHeight,
          quad[4] / pageWidth, quad[5] / pageHeight,
          quad[6] / pageWidth, quad[7] / pageHeight,
        ])
      : undefined
    
    return {
      text: selectedText.join(' '),
      bbox,
      normalizedBbox,
      pageNumber: pdfPage.pageNumber,
      quadPoints: quadPoints.length > 0 ? quadPoints : undefined,
      normalizedQuads,
    }
  } catch (error) {
    console.error('Error extracting text from selection:', error)
    return null
  }
}

/**
 * Get coordinates from mouse event relative to canvas
 */
export function getCanvasCoordinates(
  event: MouseEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}
