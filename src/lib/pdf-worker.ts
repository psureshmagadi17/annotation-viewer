// PDF.js worker configuration
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker with fallback options
const workerSrc = (() => {
  // Try local file first
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
