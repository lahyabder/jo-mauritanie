// lib/processing/structure-analyzer.ts
// Analyzes the full text of an Official Gazette to split it into individual legal documents

export interface DocumentBoundary {
  startIndex: number;
  endIndex: number;
  startPage?: number;
  endPage?: number;
  textSnippet: string;
  detectedType?: string;
  detectedNumber?: string;
  detectedDate?: string;
}

export interface SplitResult {
  documents: Array<{
    sequence: number;
    text: string;
    startPage?: number;
    endPage?: number;
    boundary: DocumentBoundary;
  }>;
  unclassifiedBlocks: string[];
}

/**
 * Heuristics-based structure analyzer for Mauritanian Official Gazette
 * Looks for common headers like "مرسوم", "قانون", "قرار", "Loi", "Décret", "Arrêté"
 */
export function splitGazetteIntoDocuments(fullText: string, pageMap?: { page: number, textIndex: number }[]): SplitResult {
  const documents: SplitResult['documents'] = [];
  const unclassifiedBlocks: string[] = [];
  
  // Mauritanian JO typical document boundaries (Arabic & French)
  const documentStartRegex = /(قانون\s+رقم|قانون\s+نظامي|مرسوم\s+رقم|قرار\s+رقم|مقرر\s+رقم|تعميم\s+رقم|LOI\s+N°|DECRET\s+N°|ARRETE\s+N°|CIRCULAIRE\s+N°|DECISION\s+N°)/gi;
  
  let match;
  const boundaries: DocumentBoundary[] = [];
  
  while ((match = documentStartRegex.exec(fullText)) !== null) {
    // Attempt to extract the number
    const snippet = fullText.substring(match.index, Math.min(match.index + 200, fullText.length));
    const numberMatch = snippet.match(/(رقم|N°)\s*([0-9\-\/\.\w]+)/i);
    const docNumber = numberMatch ? numberMatch[2].trim() : undefined;
    
    // Determine type
    const marker = match[1].toLowerCase();
    let detectedType = 'other';
    if (marker.includes('قانون') || marker.includes('loi')) detectedType = 'law';
    else if (marker.includes('مرسوم') || marker.includes('decret') || marker.includes('décret')) detectedType = 'decree';
    else if (marker.includes('قرار') || marker.includes('مقرر') || marker.includes('arrete') || marker.includes('arrêté') || marker.includes('decision') || marker.includes('décision')) detectedType = 'decision';
    else if (marker.includes('تعميم') || marker.includes('circulaire')) detectedType = 'circular';
    
    boundaries.push({
      startIndex: match.index,
      endIndex: -1, // Will be set in next pass
      textSnippet: snippet,
      detectedType,
      detectedNumber: docNumber,
    });
  }
  
  // Set end indices
  for (let i = 0; i < boundaries.length; i++) {
    boundaries[i].endIndex = (i < boundaries.length - 1) ? boundaries[i + 1].startIndex : fullText.length;
  }
  
  // Extract the text blocks
  let sequence = 1;
  let lastEnd = 0;
  
  for (const b of boundaries) {
    // Catch anything before the first document
    if (b.startIndex > lastEnd) {
      const preamble = fullText.substring(lastEnd, b.startIndex).trim();
      if (preamble.length > 50) {
        unclassifiedBlocks.push(preamble);
      }
    }
    
    const docText = fullText.substring(b.startIndex, b.endIndex).trim();
    
    // Find page numbers if pageMap provided
    let startPage, endPage;
    if (pageMap && pageMap.length > 0) {
        startPage = pageMap.find(p => p.textIndex >= b.startIndex)?.page || pageMap[pageMap.length - 1].page;
        endPage = pageMap.find(p => p.textIndex >= b.endIndex)?.page || pageMap[pageMap.length - 1].page;
        if(endPage < startPage) endPage = startPage;
    }
    
    documents.push({
      sequence: sequence++,
      text: docText,
      startPage,
      endPage,
      boundary: b
    });
    
    lastEnd = b.endIndex;
  }
  
  return { documents, unclassifiedBlocks };
}
