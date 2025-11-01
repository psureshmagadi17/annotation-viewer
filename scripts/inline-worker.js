import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read the built HTML file
const htmlPath = join(rootDir, 'dist', 'index.html')
let html = readFileSync(htmlPath, 'utf-8')

// Read the PDF.js worker file
const workerPath = join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const workerContent = readFileSync(workerPath, 'utf-8')

// Convert worker to base64 data URL
const workerBase64 = Buffer.from(workerContent).toString('base64')
const workerDataUrl = `data:application/javascript;base64,${workerBase64}`

// Create a script that sets up the worker before any modules load
// This must run synchronously before the main script
const workerSetupScript = `
<script>
  // Setup PDF.js worker from inline content - must run before any modules
  (function() {
    const workerDataUrl = '${workerDataUrl}';
    // Store for PDF.js to use
    if (typeof window !== 'undefined') {
      window.__PDFJS_WORKER_URL__ = workerDataUrl;
    }
  })();
</script>
`

// Insert the worker setup script right after the opening <body> tag
// This ensures it runs before any module scripts
html = html.replace('<body>', `<body>${workerSetupScript}`)

// Write the updated HTML
writeFileSync(htmlPath, html, 'utf-8')

// Rename to annotation-viewer.html
const outputPath = join(rootDir, 'dist', 'annotation-viewer.html')
writeFileSync(outputPath, html, 'utf-8')

console.log('✅ Worker file inlined successfully!')
console.log(`📄 Single-file HTML saved to: ${outputPath}`)

