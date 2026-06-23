// lib/processing/pdf-extractor.ts
// PDF text extraction using pdfjs-dist
// Handles both native text layers and image-only PDFs

import type { TextItem } from 'pdfjs-dist/types/src/display/api'

export interface PageExtractionResult {
  pageNumber: number
  text: string
  confidence: number        // 0–100, estimated from text density
  hasNativeText: boolean
  wordCount: number
  charCount: number
  isImageOnly: boolean
}

export interface PDFExtractionResult {
  totalPages: number
  pages: PageExtractionResult[]
  fullText: string
  avgConfidence: number
  needsOcr: boolean         // true if too many pages are image-only
  ocrPageNumbers: number[]  // pages that need OCR
  metadata: {
    title?: string
    author?: string
    creationDate?: string
    language?: string
  }
}

// Minimum characters per page to consider text as "native"
const MIN_CHARS_FOR_NATIVE_TEXT = 50

export async function extractPdfText(
  pdfBuffer: ArrayBuffer
): Promise<PDFExtractionResult> {
  // Dynamic import to avoid SSR issues with pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist')

  // Use legacy build for Node.js compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    // Arabic/RTL text support
    standardFontDataUrl: undefined,
  } as any).promise

  const totalPages = pdf.numPages
  const pages: PageExtractionResult[] = []
  const ocrPageNumbers: number[] = []

  // Extract document metadata
  const pdfMeta = await pdf.getMetadata().catch(() => ({ info: {}, metadata: null }))
  const metadata = {
    title: (pdfMeta.info as Record<string, string>)?.Title || undefined,
    author: (pdfMeta.info as Record<string, string>)?.Author || undefined,
    creationDate: (pdfMeta.info as Record<string, string>)?.CreationDate || undefined,
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent({
      includeMarkedContent: false,
    })

    const items = textContent.items as TextItem[]
    
    // Reconstruct text respecting RTL layout
    // Sort items by y-position (top to bottom), then x-position
    const sortedItems = [...items].sort((a, b) => {
      const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5])
      if (Math.abs(yDiff) > 3) return yDiff
      // Same line: for Arabic (RTL), sort right to left
      return b.transform[4] - a.transform[4]
    })

    // Group into lines and join
    let currentY = -Infinity
    const lines: string[] = []
    let currentLine = ''

    for (const item of sortedItems) {
      const y = Math.round(item.transform[5])
      if (Math.abs(y - currentY) > 5 && currentLine) {
        lines.push(currentLine.trim())
        currentLine = ''
      }
      currentY = y
      currentLine += item.str + (item.hasEOL ? '\n' : ' ')
    }
    if (currentLine.trim()) lines.push(currentLine.trim())

    const text = lines.join('\n').trim()
    const charCount = text.length
    const wordCount = text.split(/\s+/).filter(Boolean).length
    const hasNativeText = charCount >= MIN_CHARS_FOR_NATIVE_TEXT
    const isImageOnly = charCount < 10

    if (isImageOnly) {
      ocrPageNumbers.push(pageNum)
    }

    // Rough confidence: based on text density vs. page area
    const viewport = page.getViewport({ scale: 1 })
    const pageArea = viewport.width * viewport.height
    const textDensity = Math.min(charCount / (pageArea / 1000), 1)
    const confidence = isImageOnly ? 0 : Math.min(textDensity * 100, 95)

    pages.push({
      pageNumber: pageNum,
      text,
      confidence,
      hasNativeText,
      wordCount,
      charCount,
      isImageOnly,
    })
  }

  const fullText = pages.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n')
  const avgConfidence =
    pages.reduce((sum, p) => sum + p.confidence, 0) / (pages.length || 1)

  return {
    totalPages,
    pages,
    fullText,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    needsOcr: ocrPageNumbers.length > 0,
    ocrPageNumbers,
    metadata,
  }
}
