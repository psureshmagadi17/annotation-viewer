import { readFileAsArrayBuffer, validatePdfFile } from './utils'

/**
 * Handle file selection for PDF loading
 */
export async function handleFileSelection(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = false
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const validation = validatePdfFile(file)
        if (validation.valid) {
          resolve(file)
        } else {
          alert(`Invalid file: ${validation.error}`)
          resolve(null)
        }
      } else {
        resolve(null)
      }
    }
    
    input.click()
  })
}

/**
 * Handle drag and drop for PDF files
 */
export function setupDragAndDrop(
  element: HTMLElement,
  onFileDrop: (file: File) => void
): () => void {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.add('drag-over')
  }
  
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.remove('drag-over')
  }
  
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.remove('drag-over')
    
    const files = Array.from(e.dataTransfer?.files || [])
    const pdfFile = files.find(file => file.type === 'application/pdf')
    
    if (pdfFile) {
      const validation = validatePdfFile(pdfFile)
      if (validation.valid) {
        onFileDrop(pdfFile)
      } else {
        alert(`Invalid file: ${validation.error}`)
      }
    } else {
      alert('Please drop a PDF file')
    }
  }
  
  element.addEventListener('dragover', handleDragOver)
  element.addEventListener('dragleave', handleDragLeave)
  element.addEventListener('drop', handleDrop)
  
  // Return cleanup function
  return () => {
    element.removeEventListener('dragover', handleDragOver)
    element.removeEventListener('dragleave', handleDragLeave)
    element.removeEventListener('drop', handleDrop)
  }
}

/**
 * Download data as a file
 */
export function downloadFile(
  data: string | Blob,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
