import { Annotation } from '@/types'

/**
 * Export annotations to XFDF format for Adobe compatibility
 */
export function exportToXfdf(annotations: Annotation[], fileName: string): string {
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
      
      return `    <${annotation.pdf_annotation_type || 'highlight'}>
      <rect>${rect}</rect>
      <contents>${escapeXml(annotation.span_text)}</contents>
      <popup>
        <rect>${rect}</rect>
        <open>no</open>
      </popup>
      <page>${annotation.page - 1}</page>
    </${annotation.pdf_annotation_type || 'highlight'}>`
    })
    .join('\n')

  return `${xfdfHeader}\n${annotationElements}\n${xfdfFooter}`
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
