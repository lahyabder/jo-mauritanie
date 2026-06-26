import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jo.afrikyia.com';
const SITE_TITLE = 'الجريدة الرسمية الموريتانية — Journal Officiel de Mauritanie';
const SITE_DESC  = 'آخر القوانين والمراسيم والقرارات الصادرة في الجريدة الرسمية';
const SITE_LANG  = 'ar';

/** Escape characters that break XML */
function xmlEscape(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format a date string as RFC-822 (required by RSS 2.0) */
function toRfc822(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toUTCString();
  return new Date(dateStr).toUTCString();
}

/** Human-readable document type label (Arabic) */
function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    law:          'قانون',
    decree:       'مرسوم',
    decision:     'قرار',
    regulation:   'نظام',
    circular:     'منشور',
    announcement: 'إعلان',
    notification: 'إخطار',
    appointment:  'تعيين',
    other:        'وثيقة',
  };
  return labels[type] ?? 'وثيقة';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ── Fetch last 20 published documents ────────────────────────────────────
    const { data: docs, error } = await supabase
      .from('documents')
      .select(`
        id,
        type,
        official_number,
        title_ar,
        title_fr,
        summary_ar,
        ai_summary_ar,
        document_date,
        created_at,
        issues ( issue_number, publication_date, pdf_url )
      `)
      .eq('status', 'published')
      .eq('is_current_version', true)
      .eq('is_confidential', false)
      .order('document_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[RSS] Query error:', error.message);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(error.message)}</error>`,
        { status: 500, headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
      );
    }

    const items = (docs ?? []).map((doc) => {
      const issue = doc.issues as any;
      const title = xmlEscape(doc.title_ar ?? doc.title_fr ?? `${typeLabel(doc.type)} ${doc.official_number ?? ''}`);
      const description = xmlEscape(doc.ai_summary_ar ?? doc.summary_ar ?? title);
      const link = `${SITE_URL}/ar/documents/${doc.id}`;
      const pubDate = toRfc822(doc.document_date ?? doc.created_at);
      const category = xmlEscape(typeLabel(doc.type));
      const issueNum = issue?.issue_number ? ` — العدد ${issue.issue_number}` : '';

      return `
    <item>
      <title>${title}${xmlEscape(issueNum)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${category}</category>
      ${doc.official_number ? `<dc:identifier>${xmlEscape(doc.official_number)}</dc:identifier>` : ''}
    </item>`;
    }).join('\n');

    const lastBuildDate = toRfc822(docs?.[0]?.document_date ?? null);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(SITE_TITLE)}</title>
    <link>${SITE_URL}/ar</link>
    <description>${xmlEscape(SITE_DESC)}</description>
    <language>${SITE_LANG}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${SITE_URL}/api/rss" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/favicon.ico</url>
      <title>${xmlEscape(SITE_TITLE)}</title>
      <link>${SITE_URL}/ar</link>
    </image>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (err: any) {
    console.error('[RSS] Unexpected error:', err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(err.message)}</error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    );
  }
}
