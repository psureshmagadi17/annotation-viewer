import { Annotation, PdfDocumentMeta } from '@/types'

/**
 * Export annotations to XFDF format for Adobe compatibility
 */
export function exportToXfdf(annotations: Annotation[], fileName: string, includeFeedback: boolean = true): string {
  const xfdfHeader = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf" xml:space="preserve">
  <f href="${fileName}"/>
  <fields/>
  <annots>`

  const xfdfFooter = `  </annots>
</xfdf>`

  const annotationElements = annotations
    .filter(ann => ann.bbox && ann.normalized_bbox)
    .map(annotation => {
      const bbox = annotation.bbox!
      const rect = `${bbox.x},${bbox.y},${bbox.x + bbox.w},${bbox.y + bbox.h}`
      
      // Build contents with feedback information
      let contents = annotation.span_text
      if (includeFeedback) {
        const statusText = getStatusText(annotation.feedback_type)
        contents = `[${statusText}] ${annotation.span_text}`
        if (annotation.notes) {
          contents += `\n\nNotes: ${annotation.notes}`
        }
      }
      
      return `    <${annotation.pdf_annotation_type || 'highlight'}>
      <rect>${rect}</rect>
      <contents>${escapeXml(contents)}</contents>
      <popup>
        <rect>${rect}</rect>
        <open>no</open>
      </popup>
      <page>${annotation.page - 1}</page>
      <title>${escapeXml(annotation.entity_type)}</title>
    </${annotation.pdf_annotation_type || 'highlight'}>`
    })
    .join('\n')

  return `${xfdfHeader}\n${annotationElements}\n${xfdfFooter}`
}

/**
 * Get human-readable status text
 */
function getStatusText(feedbackType: string): string {
  switch (feedbackType) {
    case 'true_positive':
      return 'CORRECT'
    case 'false_positive':
      return 'INCORRECT'
    case 'false_negative':
      return 'NEEDS EDIT'
    default:
      return 'UNREVIEWED'
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Download XFDF content as a file
 */
export function downloadXfdf(xfdfContent: string, fileName: string): void {
  const blob = new Blob([xfdfContent], { type: 'application/vnd.adobe.xfdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName.replace('.pdf', '')}_annotations.xfdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
