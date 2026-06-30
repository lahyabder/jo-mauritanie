import * as cheerio from 'cheerio';

export interface ScrapedIssue {
  title: string;
  pdfUrl: string;
  issueNumber: string;
  publicationDate: string;
  language: 'ar' | 'fr';
}

const ARABIC_URL = 'https://msgg.gov.mr/ar/le-journal-officiel-ar.html';
const FRENCH_URL = 'https://msgg.gov.mr/fr/le-journal-officiel.html';

/**
 * Extracts issue number and date from a string like:
 * "الجريدة الرسمية رقم2026-1598 بتاريخ 30/01/2026"
 * or "Journal officiel n°2026-1607 du 15/06/2026"
 */
function parseIssueInfo(text: string, language: 'ar' | 'fr'): { num: string, date: string } {
  let numMatch;
  let dateMatch;

  if (language === 'ar') {
    numMatch = text.match(/رقم\s*([\d-]+(?:\s*bis| مكرر)?)/i);
    dateMatch = text.match(/بتاريخ\s*([\d\/]+)/i);
  } else {
    numMatch = text.match(/n°\s*([\d-]+(?:\s*bis)?)/i);
    dateMatch = text.match(/du\s*([\d\/]+)/i);
  }

  let num = numMatch ? numMatch[1].trim() : '';
  let dateStr = dateMatch ? dateMatch[1].trim() : '';

  // Convert DD/MM/YYYY to YYYY-MM-DD
  let isoDate = '';
  if (dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  return { num, date: isoDate };
}

export async function scrapeIssues(language: 'ar' | 'fr'): Promise<ScrapedIssue[]> {
  const targetUrl = language === 'ar' ? ARABIC_URL : FRENCH_URL;
  const baseUrl = 'https://msgg.gov.mr';

  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${targetUrl}: ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const issues: ScrapedIssue[] = [];

  $('a').each((_, el) => {
    const text = $(el).text().trim();
    let href = $(el).attr('href');

    if (href && href.toLowerCase().endsWith('.pdf')) {
      // Handle relative URLs
      if (!href.startsWith('http')) {
        href = baseUrl + (href.startsWith('/') ? href : '/' + href);
      }

      const { num, date } = parseIssueInfo(text, language);
      
      if (num && date) {
        issues.push({
          title: text,
          pdfUrl: href,
          issueNumber: num,
          publicationDate: date,
          language
        });
      }
    }
  });

  return issues;
}
