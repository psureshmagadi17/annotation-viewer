import React, { useState } from 'react'
import { usePdfStore } from '@/stores/pdfStore'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  FileSpreadsheet, 
  FileType,
  Loader2,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  exportToJson, 
  exportToCsv, 
  downloadFile, 
  generateFilename 
} from '@/lib/export-utils'
import { exportToXfdf } from '@/lib/xfdf-exporter'

interface ExportButtonsProps {
  className?: string
  reviewerId?: string
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  className,
  reviewerId 
}) => {
  const { annotations, pdfMeta } = usePdfStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  const hasAnnotations = annotations.length > 0
  const hasReviewedAnnotations = annotations.some(a => 
    a.feedback_type !== 'unreviewed' || a.notes
  )

  const handleExport = async (
    format: 'json' | 'csv' | 'xfdf',
    exportFunction: () => void
  ) => {
    if (!pdfMeta || !hasAnnotations) return

    setExporting(format)
    setExportSuccess(null)

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      exportFunction()
      
      setExportSuccess(format)
      setTimeout(() => setExportSuccess(null), 2000)
    } catch (error) {
      console.error(`Export ${format} failed:`, error)
      // TODO: Show error toast
    } finally {
      setExporting(null)
    }
  }

  const handleJsonExport = () => {
    if (!pdfMeta) return
    
    const jsonContent = exportToJson(annotations, pdfMeta, reviewerId)
    const filename = generateFilename(pdfMeta.file_name, 'json')
    
    downloadFile(jsonContent, filename, 'application/json')
  }

  const handleCsvExport = () => {
    if (!pdfMeta) return
    
    const csvContent = exportToCsv(annotations, pdfMeta, reviewerId)
    const filename = generateFilename(pdfMeta.file_name, 'csv')
    
    downloadFile(csvContent, filename, 'text/csv')
  }

  const handleXfdfExport = () => {
    if (!pdfMeta) return
    
    const xfdfContent = exportToXfdf(annotations, pdfMeta.file_name, true)
    const filename = generateFilename(pdfMeta.file_name, 'xfdf')
    
    downloadFile(xfdfContent, filename, 'application/vnd.adobe.xfdf')
  }

  if (!pdfMeta || !hasAnnotations) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Export Label */}
      <span className="text-sm text-muted-foreground mr-2">
        Export:
      </span>

      {/* JSON Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('json', handleJsonExport)}
        disabled={exporting === 'json'}
        className="gap-2"
      >
        {exporting === 'json' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : exportSuccess === 'json' ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        JSON
      </Button>

      {/* CSV Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv', handleCsvExport)}
        disabled={exporting === 'csv'}
        className="gap-2"
      >
        {exporting === 'csv' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : exportSuccess === 'csv' ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        CSV
      </Button>

      {/* XFDF Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('xfdf', handleXfdfExport)}
        disabled={exporting === 'xfdf'}
        className="gap-2"
      >
        {exporting === 'xfdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : exportSuccess === 'xfdf' ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <FileType className="w-4 h-4" />
        )}
        XFDF
      </Button>

      {/* Export Info */}
      {hasReviewedAnnotations && (
        <div className="text-xs text-muted-foreground ml-2">
          {annotations.filter(a => a.feedback_type !== 'unreviewed' || a.notes).length} reviewed
        </div>
      )}
    </div>
  )
}
