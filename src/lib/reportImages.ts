export function normalizeReportImage(value?: string | null): string | null {
  const image = value?.trim()
  if (!image) return null
  if (/^(https?:\/\/|data:)/i.test(image)) return image
  // JPEG base64 starts with /9j/: a leading slash alone is not a URL.
  if (/^\/?(?:assets|images)\//.test(image)) {
    return image.startsWith('/') ? image : `/${image}`
  }
  const base64 = image.replace(/\s/g, '')
  const mime = base64.startsWith('iVBORw0KGgo') ? 'image/png'
    : base64.startsWith('R0lGOD') ? 'image/gif'
    : base64.startsWith('UklGR') ? 'image/webp'
    : 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

interface ReportImages {
  reviewType?: string
  imageUri?: string
  processedImage?: string
  rawPhoto?: string
  imageUrl?: string
  reportImage?: string
  reportProcessedImage?: string
}

export function getReportPreview(report?: ReportImages | null): string | null {
  if (!report) return null
  const original = report.imageUri || report.reportImage || report.rawPhoto || report.imageUrl
  return normalizeReportImage(report.reviewType === 'admin-modified'
    ? original
    : report.processedImage || report.reportProcessedImage || original)
}
