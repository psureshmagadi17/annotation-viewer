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
 * Calculate intersection area between two rectangles
 */
function getIntersectionArea(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): number {
  const left = Math.max(rect1.x, rect2.x)
  const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width)
  const top = Math.max(rect1.y, rect2.y)
  const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height)
  
  if (left < right && top < bottom) {
    return (right - left) * (bottom - top)
  }
  return 0
}

/**
 * Get text content from PDF.js text layer with accurate selection
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
    
    // Normalize selection coordinates
    const selectionLeft = Math.min(startX, endX)
    const selectionRight = Math.max(startX, endX)
    const selectionTop = Math.min(startY, endY)
    const selectionBottom = Math.max(startY, endY)
    
    const selectionRect = {
      x: selectionLeft,
      y: selectionTop,
      width: selectionRight - selectionLeft,
      height: selectionBottom - selectionTop,
    }
    
    // Process text items with accurate coordinate transformation
    interface TextItem {
      x: number
      y: number
      width: number
      height: number
      str: string
      itemIndex: number
    }
    
    const textItems: TextItem[] = []
    
    // Transform text items to viewport coordinates
    // PDF.js text items have transform matrices in PDF user space (points, bottom-left origin)
    // We need to convert to viewport space (pixels, top-left origin)
    // The viewport.scale converts from PDF points to pixels
    const scale = viewport.scale
    
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i]
      if (!item.str || item.str.trim() === '') continue
      
      // PDF.js transform matrix: [a, b, c, d, e, f]
      // where e (tx[4]) is X translation and f (tx[5]) is Y translation in PDF user space (points)
      const tx = item.transform
      
      // Get text item position in PDF user space coordinates (points)
      const pdfX = tx[4]
      const pdfY = tx[5] // Baseline Y position in PDF coordinates (bottom-left origin)
      
      // Convert PDF coordinates to viewport coordinates (pixels)
      // Scale from PDF points to pixels
      const x = pdfX * scale
      
      // Get text dimensions in PDF user space (points)
      const width = (item.width || 0) * scale // Convert to pixels
      // Height: use item.height if available, otherwise estimate from fontSize
      const heightPoints = item.height || (item.fontSize || 0)
      const height = heightPoints * scale // Convert to pixels
      
      // Convert Y coordinate from PDF (bottom-left) to viewport (top-left)
      // PDF Y coordinate represents the baseline
      // In PDF.js, height typically extends upward from baseline
      // So the text box extends from (pdfY - height) to pdfY in PDF coordinates
      const pdfTextBottom = pdfY - heightPoints // Bottom of text in PDF coordinates
      const pdfTextTop = pdfY // Top of text (baseline) in PDF coordinates
      
      // Convert to viewport coordinates (flip Y and scale)
      const viewportTextTop = viewport.height - (pdfTextTop * scale)
      const viewportTextBottom = viewport.height - (pdfTextBottom * scale)
      
      // Text item rectangle in viewport coordinates
      const itemRect = {
        x,
        y: viewportTextTop, // Top-left corner Y
        width,
        height: viewportTextBottom - viewportTextTop, // Height in viewport space
      }
      
      // Calculate intersection area
      const intersectionArea = getIntersectionArea(selectionRect, itemRect)
      const itemArea = width * height
      
      // Only include text items that have significant overlap (>30% of item area)
      // This prevents including text items that are barely touched by selection
      if (intersectionArea > 0 && itemArea > 0) {
        const overlapRatio = intersectionArea / itemArea
        
        // Require at least 30% overlap for inclusion
        if (overlapRatio >= 0.3) {
          textItems.push({
            x: itemRect.x,
            y: itemRect.y,
            width: itemRect.width,
            height: itemRect.height,
            str: item.str,
            itemIndex: i,
          })
        }
      }
    }
    
    if (textItems.length === 0) {
      return null
    }
    
    // Sort text items by position (top-to-bottom, left-to-right)
    textItems.sort((a, b) => {
      const yDiff = a.y - b.y
      if (Math.abs(yDiff) > 5) {
        // Different lines - sort by Y
        return yDiff
      }
      // Same line - sort by X
      return a.x - b.x
    })
    
    // Extract text preserving layout
    const selectedText: string[] = []
    let lastY = -Infinity
    let lastX = -Infinity
    
    textItems.forEach((item, index) => {
      const isNewLine = Math.abs(item.y - lastY) > 5
      const needsSpace = !isNewLine && item.x - (lastX + textItems[index - 1]?.width || 0) > 2
      
      if (index > 0 && needsSpace) {
        selectedText.push(' ')
      }
      
      selectedText.push(item.str)
      
      lastY = item.y
      lastX = item.x + item.width
    })
    
    // Calculate precise bounding box from intersection of text items with selection
    // Clip to selection rectangle to ensure accuracy
    const allX: number[] = []
    const allY: number[] = []
    
    textItems.forEach(item => {
      // Only include the portion of text item that's within selection
      const itemLeft = Math.max(item.x, selectionLeft)
      const itemRight = Math.min(item.x + item.width, selectionRight)
      const itemTop = Math.max(item.y, selectionTop)
      const itemBottom = Math.min(item.y + item.height, selectionBottom)
      
      allX.push(itemLeft, itemRight)
      allY.push(itemTop, itemBottom)
    })
    
    // Also include selection bounds to ensure we capture the full selection
    allX.push(selectionLeft, selectionRight)
    allY.push(selectionTop, selectionBottom)
    
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
      const lines: TextItem[][] = []
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
      
      // Sort lines by Y position
      lines.sort((a, b) => a[0].y - b[0].y)
      
      // Create quad for each line, clipped to selection
      lines.forEach(line => {
        const lineX = Math.max(Math.min(...line.map(i => i.x)), selectionLeft)
        const lineY = Math.max(Math.min(...line.map(i => i.y)), selectionTop)
        const lineRight = Math.min(Math.max(...line.map(i => i.x + i.width)), selectionRight)
        const lineBottom = Math.min(Math.max(...line.map(i => i.y + i.height)), selectionBottom)
        
        // Quad format: [x1,y1, x2,y2, x3,y3, x4,y4]
        quadPoints.push([
          lineX, lineY,
          lineRight, lineY,
          lineRight, lineBottom,
          lineX, lineBottom
        ])
      })
    } else if (textItems.length === 1) {
      // Single item - create quad from intersection with selection
      const item = textItems[0]
      const itemLeft = Math.max(item.x, selectionLeft)
      const itemRight = Math.min(item.x + item.width, selectionRight)
      const itemTop = Math.max(item.y, selectionTop)
      const itemBottom = Math.min(item.y + item.height, selectionBottom)
      
      quadPoints.push([
        itemLeft, itemTop,
        itemRight, itemTop,
        itemRight, itemBottom,
        itemLeft, itemBottom
      ])
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
      text: selectedText.join(''),
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
