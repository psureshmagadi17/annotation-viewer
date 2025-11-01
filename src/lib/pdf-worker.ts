// PDF.js worker configuration
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker with fallback options
const workerSrc = (() => {
  // Single-file mode: check for inline worker blob URL first
  if (import.meta.env.VITE_SINGLEFILE === 'true') {
    // Check if worker URL was set up by inline script
    if (typeof window !== 'undefined' && (window as any).__PDFJS_WORKER_URL__) {
      return (window as any).__PDFJS_WORKER_URL__
    }
    // Fallback to CDN if blob URL not available
    const version = pdfjsLib.version
    return `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`
  }
  
  // Try local file first (dev mode)
  if (import.meta.env.DEV) {
    return '/pdf.worker.min.js'
  }
  
  // Production fallbacks
  const version = pdfjsLib.version
  const fallbacks = [
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`
  ]
  
  return fallbacks[0] // Use unpkg as primary fallback
})()

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

console.log('PDF.js version:', pdfjsLib.version)
console.log('PDF.js worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc)

export { pdfjsLib }
