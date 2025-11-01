import React, { useEffect, useRef, useState, useCallback } from 'react'
import { usePdfStore } from '@/stores/pdfStore'
import { pdfjsLib } from '@/lib/pdf-worker'
import { cn } from '@/lib/utils'
import { CreateAnnotationDialog } from './CreateAnnotationDialog'
import { getTextFromSelection, getCanvasCoordinates } from '@/lib/text-selection-utils'

interface PdfViewerProps {
  className?: string
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [pageViewport, setPageViewport] = useState<{ width: number; height: number } | null>(null)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)
  
  // Text selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [currentPage, setCurrentPage] = useState<any>(null)
  const [currentViewport, setCurrentViewport] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTextData, setSelectedTextData] = useState<any>(null)
  
  const {
    pdfDocument,
    pdfMeta,
    isLoading,
    error,
    viewerState,
    annotationsByPage,
  } = usePdfStore()

  // Render a specific page
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return

    setIsRendering(true)
    try {
      const page = await pdfDocument.getPage(pageNumber)
      const scale = viewerState.scale
      const viewport = page.getViewport({ scale })
      
      setPageViewport({ width: viewport.width, height: viewport.height })
      setCurrentPage(page)
      setCurrentViewport(viewport)
      
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      // Clear the canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }

      // Cancel any existing render task
      if (renderPage.currentRenderTask) {
        renderPage.currentRenderTask.cancel()
      }

      const renderTask = page.render(renderContext)
      renderPage.currentRenderTask = renderTask
      
      await renderTask.promise
      renderPage.currentRenderTask = null
    } catch (err) {
      // Ignore rendering cancellation errors as they're expected when switching pages
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err)
      }
    } finally {
      setIsRendering(false)
    }
  }, [pdfDocument, viewerState.scale])

  // Store the current render task to cancel it if needed
  renderPage.currentRenderTask = null

  // Render current page when it changes
  useEffect(() => {
    if (pdfDocument && viewerState.current_page) {
      renderPage(viewerState.current_page)
    }
  }, [pdfDocument, viewerState.current_page, renderPage])

  // Update canvas display size when it changes (for CSS scaling)
  useEffect(() => {
    if (canvasRef.current && pageViewport) {
      const updateSize = () => {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          setCanvasDisplaySize({ width: rect.width, height: rect.height })
        }
      }
      
      updateSize()
      const resizeObserver = new ResizeObserver(updateSize)
      resizeObserver.observe(canvasRef.current)
      
      window.addEventListener('resize', updateSize)
      return () => {
        resizeObserver.disconnect()
        window.removeEventListener('resize', updateSize)
      }
    }
  }, [pageViewport])

  // Handle scale changes
  useEffect(() => {
    if (pdfDocument && viewerState.current_page) {
      renderPage(viewerState.current_page)
    }
  }, [viewerState.scale, renderPage])

  // Cleanup render task on unmount
  useEffect(() => {
    return () => {
      if (renderPage.currentRenderTask) {
        renderPage.currentRenderTask.cancel()
      }
    }
  }, [renderPage])

  // Text selection handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !viewerState.is_overlay_visible) return
    
    const coords = getCanvasCoordinates(e.nativeEvent, canvasRef.current)
    if (coords) {
      setIsSelecting(true)
      setSelectionStart(coords)
      setSelectionEnd(coords)
    }
  }, [viewerState.is_overlay_visible])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !canvasRef.current || !selectionStart) return
    
    const coords = getCanvasCoordinates(e.nativeEvent, canvasRef.current)
    if (coords) {
      setSelectionEnd(coords)
    }
  }, [isSelecting, selectionStart])

  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || !selectionEnd || !currentPage || !currentViewport) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      return
    }

    // Check if selection has meaningful size
    const minSize = 10
    if (Math.abs(selectionEnd.x - selectionStart.x) < minSize || 
        Math.abs(selectionEnd.y - selectionStart.y) < minSize) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      return
    }

    // Extract text from selection
    const textSelection = await getTextFromSelection(
      currentPage,
      currentViewport,
      selectionStart.x,
      selectionStart.y,
      selectionEnd.x,
      selectionEnd.y
    )

    if (textSelection) {
      setSelectedTextData({
        text: textSelection.text,
        page: textSelection.pageNumber,
        bbox: textSelection.bbox,
        normalizedBbox: textSelection.normalizedBbox,
        quadPoints: textSelection.quadPoints,
        normalizedQuads: textSelection.normalizedQuads,
      })
      setShowCreateDialog(true)
    }

    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [isSelecting, selectionStart, selectionEnd, currentPage, currentViewport])

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold mb-2">Error loading PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!pdfDocument) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg">No PDF loaded</p>
          <p className="text-sm">Load a PDF to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full overflow-auto", className)} ref={containerRef}>
      <div className="flex justify-center p-4">
        <div className="relative inline-block" style={{ width: canvasDisplaySize?.width || 'auto', height: canvasDisplaySize?.height || 'auto' }}>
          <canvas
            ref={canvasRef}
            className="block shadow-lg select-none"
            style={{ maxWidth: '100%', height: 'auto', cursor: isSelecting ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isSelecting) {
                setIsSelecting(false)
                setSelectionStart(null)
                setSelectionEnd(null)
              }
            }}
          />
          
          {/* Selection overlay */}
          {isSelecting && selectionStart && selectionEnd && canvasDisplaySize && canvasRef.current && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
              style={{
                left: `${(Math.min(selectionStart.x, selectionEnd.x) / canvasRef.current.width) * canvasDisplaySize.width}px`,
                top: `${(Math.min(selectionStart.y, selectionEnd.y) / canvasRef.current.height) * canvasDisplaySize.height}px`,
                width: `${(Math.abs(selectionEnd.x - selectionStart.x) / canvasRef.current.width) * canvasDisplaySize.width}px`,
                height: `${(Math.abs(selectionEnd.y - selectionStart.y) / canvasRef.current.height) * canvasDisplaySize.height}px`,
              }}
            />
          )}
          
          {/* Annotation overlays will be rendered here */}
          {viewerState.is_overlay_visible && pageViewport && (
            <AnnotationOverlay
              pageNumber={viewerState.current_page}
              viewport={pageViewport}
              annotations={annotationsByPage[viewerState.current_page] || []}
              canvasRef={canvasRef}
            />
          )}
          
          {/* Loading indicator for page rendering */}
          {isRendering && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Annotation Dialog */}
      {selectedTextData && (
        <CreateAnnotationDialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open)
            if (!open) {
              setSelectedTextData(null)
            }
          }}
          initialText={selectedTextData.text}
          initialPage={selectedTextData.page}
          initialBbox={selectedTextData.bbox}
          initialNormalizedBbox={selectedTextData.normalizedBbox}
          initialQuadPoints={selectedTextData.quadPoints}
          initialNormalizedQuads={selectedTextData.normalizedQuads}
        />
      )}
    </div>
  )
}

// Annotation overlay component
interface AnnotationOverlayProps {
  pageNumber: number
  viewport: { width: number; height: number }
  annotations: any[]
  canvasRef?: React.RefObject<HTMLCanvasElement>
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  pageNumber,
  viewport,
  annotations,
  canvasRef,
}) => {
  const { selectAnnotation, viewerState } = usePdfStore()
  const [canvasDisplaySize, setCanvasDisplaySize] = React.useState<{ width: number; height: number } | null>(null)

  // Get actual displayed size of canvas (accounts for CSS scaling)
  React.useEffect(() => {
    if (canvasRef?.current) {
      const updateSize = () => {
        const rect = canvasRef.current!.getBoundingClientRect()
        setCanvasDisplaySize({ width: rect.width, height: rect.height })
      }
      
      updateSize()
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
  }, [canvasRef])

  // Use displayed size if available, otherwise fall back to viewport
  const displayWidth = canvasDisplaySize?.width || viewport.width
  const displayHeight = canvasDisplaySize?.height || viewport.height
  
  // Calculate scale factors if canvas is scaled
  const scaleX = displayWidth / viewport.width
  const scaleY = displayHeight / viewport.height

  console.log(`Rendering ${annotations.length} annotation overlays on page ${pageNumber}`)
  console.log(`Viewport:`, viewport)
  console.log(`Display size:`, canvasDisplaySize)
  console.log(`Scale:`, { scaleX, scaleY })

  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map((annotation) => {
        const isSelected = viewerState.current_annotation_id === annotation.annotation_id
        
        // If annotation has QuadPoints, render multiple rectangles for multi-line highlights
        if (annotation.normalized_quads && annotation.normalized_quads.length > 0) {
          console.log(`Rendering ${annotation.normalized_quads.length} quads for annotation ${annotation.annotation_id}`)
          
          return (
            <React.Fragment key={annotation.annotation_id}>
              {annotation.normalized_quads.map((quad, index) => {
                // Quad format: [x1,y1, x2,y2, x3,y3, x4,y4]
                // We'll create a rectangle from the min/max coordinates
                const xs = [quad[0], quad[2], quad[4], quad[6]]
                const ys = [quad[1], quad[3], quad[5], quad[7]]
                const minX = Math.min(...xs)
                const minY = Math.min(...ys)
                const maxX = Math.max(...xs)
                const maxY = Math.max(...ys)
                
                const left = minX * displayWidth
                const top = minY * displayHeight
                const width = (maxX - minX) * displayWidth
                const height = (maxY - minY) * displayHeight
                
                console.log(`Quad ${index}: left=${left}, top=${top}, width=${width}, height=${height}`)
                
                const isUserCreated = annotation.is_user_created
                
                return (
                  <div
                    key={`${annotation.annotation_id}-quad-${index}`}
                    className={cn(
                      "absolute pointer-events-auto cursor-pointer border-2 transition-all hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/20"
                        : isUserCreated
                        ? "border-dashed border-orange-500 bg-orange-500/20 hover:bg-orange-500/30"
                        : "border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30"
                    )}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    onClick={() => selectAnnotation(annotation.annotation_id)}
                    title={`${annotation.annotation_title || annotation.entity_type}: ${annotation.span_text}`}
                  />
                )
              })}
            </React.Fragment>
          )
        }
        
        // Fallback to single rectangle if no QuadPoints
        if (!annotation.normalized_bbox) {
          console.warn(`Annotation missing normalized_bbox:`, annotation)
          return null
        }

        const { x, y, w, h } = annotation.normalized_bbox
        const left = x * displayWidth
        const top = y * displayHeight
        const width = w * displayWidth
        const height = h * displayHeight

        console.log(`Annotation overlay: left=${left}, top=${top}, width=${width}, height=${height}`)

        const isUserCreated = annotation.is_user_created

        return (
          <div
            key={annotation.annotation_id}
            className={cn(
              "absolute pointer-events-auto cursor-pointer border-2 transition-all hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/20"
                : isUserCreated
                ? "border-dashed border-orange-500 bg-orange-500/20 hover:bg-orange-500/30"
                : "border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30"
            )}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
            onClick={() => selectAnnotation(annotation.annotation_id)}
            title={`${annotation.annotation_title || annotation.entity_type}: ${annotation.span_text}`}
          />
        )
      })}
    </div>
  )
}
