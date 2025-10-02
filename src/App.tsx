import { PdfLoader, PdfLoadingState } from '@/components/PdfLoader'
import { PdfViewer } from '@/components/PdfViewer'
import { AnnotationSidebar } from '@/components/AnnotationSidebar'
import { usePdfStore } from '@/stores/pdfStore'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, PanelLeft, PanelLeftClose } from 'lucide-react'
import './App.css'

function App() {
  const {
    pdfDocument,
    pdfMeta,
    isLoading,
    error,
    viewerState,
    annotations,
    updateViewerState,
  } = usePdfStore()

  const handleZoomIn = () => {
    updateViewerState({ scale: Math.min(viewerState.scale * 1.2, 3.0) })
  }

  const handleZoomOut = () => {
    updateViewerState({ scale: Math.max(viewerState.scale / 1.2, 0.5) })
  }

  const handleResetZoom = () => {
    updateViewerState({ scale: 1.0 })
  }

  const handleToggleOverlay = () => {
    updateViewerState({ is_overlay_visible: !viewerState.is_overlay_visible })
  }

  const handleToggleSidebar = () => {
    updateViewerState({ is_sidebar_open: !viewerState.is_sidebar_open })
  }

  const handlePreviousPage = () => {
    if (pdfMeta && viewerState.current_page > 1) {
      updateViewerState({ current_page: viewerState.current_page - 1 })
    }
  }

  const handleNextPage = () => {
    if (pdfMeta && viewerState.current_page < pdfMeta.num_pages) {
      updateViewerState({ current_page: viewerState.current_page + 1 })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">PDF Annotation Viewer</h1>
              {pdfMeta && (
                <p className="text-sm text-muted-foreground">
                  {pdfMeta.file_name} • {pdfMeta.num_pages} pages • {annotations.length} annotations
                </p>
              )}
            </div>
            
            {pdfDocument && (
              <div className="flex items-center gap-2">
                {/* Page navigation */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={viewerState.current_page <= 1}
                  >
                    ←
                  </Button>
                  <span className="text-sm px-2">
                    {viewerState.current_page} / {pdfMeta?.num_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={viewerState.current_page >= (pdfMeta?.num_pages || 1)}
                  >
                    →
                  </Button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1 border-l pl-2">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-2 min-w-[3rem] text-center">
                    {Math.round(viewerState.scale * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Sidebar toggle */}
                <div className="flex items-center gap-1 border-l pl-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSidebar}
                    className="gap-2"
                  >
                    {viewerState.is_sidebar_open ? (
                      <PanelLeftClose className="w-4 h-4" />
                    ) : (
                      <PanelLeft className="w-4 h-4" />
                    )}
                    {viewerState.is_sidebar_open ? 'Hide' : 'Show'} Sidebar
                  </Button>
                </div>

                {/* Overlay toggle */}
                <div className="flex items-center gap-1 border-l pl-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleOverlay}
                    className="gap-2"
                  >
                    {viewerState.is_overlay_visible ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {viewerState.is_overlay_visible ? 'Hide' : 'Show'} Annotations
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">
        {/* Sidebar */}
        {pdfDocument && viewerState.is_sidebar_open && (
          <AnnotationSidebar />
        )}

        {/* PDF Viewer */}
        <div className="flex-1 flex">
          {!pdfDocument ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <PdfLoader className="max-w-md" />
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <PdfLoadingState error={error} />
            </div>
          ) : (
            <div className="flex-1">
              <PdfViewer className="h-full" />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
