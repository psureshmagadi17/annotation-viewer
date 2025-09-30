import React, { useEffect, useRef, useState, useCallback } from 'react'
import { usePdfStore } from '@/stores/pdfStore'
import { pdfjsLib } from '@/lib/pdf-worker'
import { cn } from '@/lib/utils'

interface PdfViewerProps {
  className?: string
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [pageViewport, setPageViewport] = useState<{ width: number; height: number } | null>(null)
  
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
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            className="block shadow-lg"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          
          {/* Annotation overlays will be rendered here */}
          {viewerState.is_overlay_visible && pageViewport && (
            <AnnotationOverlay
              pageNumber={viewerState.current_page}
              viewport={pageViewport}
              annotations={annotationsByPage[viewerState.current_page] || []}
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
    </div>
  )
}

// Annotation overlay component
interface AnnotationOverlayProps {
  pageNumber: number
  viewport: { width: number; height: number }
  annotations: any[]
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  pageNumber,
  viewport,
  annotations,
}) => {
  const { selectAnnotation, viewerState } = usePdfStore()

  console.log(`Rendering ${annotations.length} annotation overlays on page ${pageNumber}`)
  console.log(`Viewport:`, viewport)
  console.log(`Annotations:`, annotations)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map((annotation) => {
        if (!annotation.normalized_bbox) {
          console.warn(`Annotation missing normalized_bbox:`, annotation)
          return null
        }

        const { x, y, w, h } = annotation.normalized_bbox
        const left = x * viewport.width
        const top = y * viewport.height
        const width = w * viewport.width
        const height = h * viewport.height

        console.log(`Annotation overlay: left=${left}, top=${top}, width=${width}, height=${height}`)

        const isSelected = viewerState.current_annotation_id === annotation.annotation_id

        return (
          <div
            key={annotation.annotation_id}
            className={cn(
              "absolute pointer-events-auto cursor-pointer border-2 transition-all hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/20"
                : "border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30"
            )}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
            onClick={() => selectAnnotation(annotation.annotation_id)}
            title={`${annotation.entity_type}: ${annotation.span_text}`}
          />
        )
      })}
    </div>
  )
}
