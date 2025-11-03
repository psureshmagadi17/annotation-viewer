// PDF.js worker configuration
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?worker&url'

// Bundle the worker with Vite to serve from the same origin
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

console.log('PDF.js version:', pdfjsLib.version)
console.log('PDF.js worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc)

export { pdfjsLib }
