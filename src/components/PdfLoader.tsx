import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { usePdfStore } from '@/stores/pdfStore'
import { handleFileSelection, setupDragAndDrop } from '@/lib/file-handler'
import { readFileAsArrayBuffer, arrayBufferToUint8Array } from '@/lib/utils'
import { extractAnnotationsFromPdfJs } from '@/lib/pdf-annotation-extractor'
import { pdfjsLib } from '@/lib/pdf-worker'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfLoaderProps {
  className?: string
}

export const PdfLoader: React.FC<PdfLoaderProps> = ({ className }) => {
  const { setLoading, setError, setPdfDocument, setAnnotations, clearPdf } = usePdfStore()

  const handleFileLoad = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(file)
      
      // Check PDF header
      const header = new TextDecoder().decode(arrayBuffer.slice(0, 8))
      if (!header.startsWith('%PDF-')) {
        throw new Error('Invalid PDF file: File does not appear to be a PDF')
      }

      // Create Uint8Array for PDF.js
      const pdfBytes = arrayBufferToUint8Array(arrayBuffer)

      // Load PDF with PDF.js for rendering
      const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise
      const numPages = pdfDocument.numPages

      // Extract annotations using PDF.js's built-in getAnnotations() method
      const extractionResult = await extractAnnotationsFromPdfJs(pdfDocument, file.name)

      if (!extractionResult.success) {
        throw new Error(extractionResult.errors?.join(', ') || 'Failed to extract annotations')
      }

      // Set PDF document and metadata
      const pdfMeta = {
        file_name: file.name,
        num_pages: numPages,
        annotations_extracted: true,
      }

      setPdfDocument(pdfDocument, pdfMeta)
      setAnnotations(extractionResult.annotations)

      console.log(`✅ Successfully loaded PDF: ${file.name}`)
      console.log(`📄 Pages: ${numPages}`)
      console.log(`📝 Annotations extracted: ${extractionResult.metadata.total_annotations}`)
      console.log(`🏷️ Annotation types: ${extractionResult.metadata.annotation_types.join(', ')}`)

    } catch (error) {
      console.error('❌ Error loading PDF:', error)
      setError(error instanceof Error ? error.message : 'Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setPdfDocument, setAnnotations])

  const handleFilePicker = useCallback(async () => {
    const file = await handleFileSelection()
    if (file) {
      await handleFileLoad(file)
    }
  }, [handleFileLoad])

  const handleDragAndDrop = useCallback((file: File) => {
    handleFileLoad(file)
  }, [handleFileLoad])

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={(el) => {
          if (el) {
            setupDragAndDrop(el, handleDragAndDrop)
          }
        }}
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
      >
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Load Annotated PDF</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop a PDF file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              The app will automatically extract annotations from the PDF
            </p>
          </div>

          <div className="space-x-2">
            <Button onClick={handleFilePicker} className="gap-2">
              <Upload className="w-4 h-4" />
              Choose PDF File
            </Button>
            
            <Button
              variant="outline"
              onClick={clearPdf}
              className="gap-2"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading state component
export const PdfLoadingState: React.FC<{ error?: string | null }> = ({ error }) => {
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-destructive">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading PDF</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading PDF and extracting annotations...</p>
      </div>
    </div>
  )
}
