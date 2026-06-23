// lib/processing/ocr-engine.ts
// Tesseract.js OCR for image-only PDF pages
// Supports Arabic + French mixed documents

import Tesseract from 'tesseract.js'

export interface OcrPageResult {
  pageNumber: number
  text: string
  confidence: number         // 0–100
  wordCount: number
  lowConfidenceWords: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
}

export interface OcrResult {
  pages: OcrPageResult[]
  fullText: string
  avgConfidence: number
  totalWords: number
}

// Languages: Arabic + French (primary for Mauritanian JO)
const DEFAULT_LANGS = 'ara+fra'

export async function runOcrOnPages(
  imageBuffers: Array<{ pageNumber: number; buffer: Buffer | Uint8Array }>,
  langs: string = DEFAULT_LANGS,
  onProgress?: (page: number, total: number, progress: number) => void
): Promise<OcrResult> {
  const results: OcrPageResult[] = []
  const total = imageBuffers.length

  for (let i = 0; i < imageBuffers.length; i++) {
    const { pageNumber, buffer } = imageBuffers[i]

    const worker = await Tesseract.createWorker(langs, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(pageNumber, total, m.progress)
        }
      },
      // Optimize for Arabic RTL
    })

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      // Arabic is RTL
      preserve_interword_spaces: '1',
    })

        const { data } = await worker.recognize(buffer as any) as any;
    const text = data.text || '';
    const confidence = data.confidence || 0;
    const words = data.words || [];

    await worker.terminate();

    const lowConfidenceWords = (words as any[])
      .filter((w) => w.confidence < 60)
      .map((w) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      }));

    results.push({
      pageNumber,
      text: text.trim(),
      confidence: Math.round(confidence * 100) / 100,
      wordCount: (words || []).length,
      lowConfidenceWords,
    })
  }

  const fullText = results.map((r) => r.text).join('\n\n--- PAGE BREAK ---\n\n')
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1)
  const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0)

  return {
    pages: results,
    fullText,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    totalWords,
  }
}

/**
 * Quick quality test on a text string — estimates if OCR quality
 * is acceptable or needs manual review.
 */
export function assessTextQuality(text: string): {
  score: number         // 0–100
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  // Check for excessive garbage characters
  const garbageRatio =
    (text.match(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007E\n]/g)?.length || 0) /
    (text.length || 1)
  if (garbageRatio > 0.1) {
    issues.push('High rate of unrecognized characters')
    score -= 30
  }

  // Check minimum length
  if (text.trim().length < 100) {
    issues.push('Very short text — possible blank page or OCR failure')
    score -= 20
  }

  // Check for repeated characters (OCR hallucination)
  if (/(.)\1{5,}/.test(text)) {
    issues.push('Repeated character sequences detected')
    score -= 15
  }

  // Check word-length distribution (avg Arabic word is 4-6 chars)
  const words = text.split(/\s+/).filter(Boolean)
  const avgLen = words.reduce((s, w) => s + w.length, 0) / (words.length || 1)
  if (avgLen < 2 || avgLen > 15) {
    issues.push('Unusual word-length distribution')
    score -= 10
  }

  return { score: Math.max(0, score), issues }
}
