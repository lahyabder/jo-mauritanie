import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pdfUrlInput = formData.get('pdfUrl') as string | null;

    // Validate inputs
    if (!file && !pdfUrlInput) {
      return NextResponse.json({ error: 'Provide either a PDF file or a pdfUrl' }, { status: 400 });
    }
    if (file && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let pdfUrl: string;
    let fileName: string;

    if (file) {
      // ── Upload to Supabase Storage ─────────────────────────────────────────
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const storageKey = `gazette-pdfs/${Date.now()}_${fileName}`;
      const { error: storageError } = await supabase.storage
        .from('gazette-pdfs')
        .upload(storageKey, bytes, { contentType: 'application/pdf', upsert: true });

      if (storageError) {
        console.error('Storage upload error:', storageError);
        return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
      }

      // Get public URL
      const { data: publicData } = supabase.storage.from('gazette-pdfs').getPublicUrl(storageKey);
      pdfUrl = publicData.publicUrl;
    } else {
      // ── Use provided URL ───────────────────────────────────────────────────
      pdfUrl = pdfUrlInput!;
      fileName = pdfUrl.split('/').pop() ?? 'gazette.pdf';
    }

    // ── Create sync_log record ─────────────────────────────────────────────
    const { data: logRow, error: logError } = await supabase
      .from('sync_logs')
      .insert({ file_name: fileName, pdf_url: pdfUrl, status: 'processing' })
      .select()
      .single();

    if (logError) {
      console.error('sync_logs insert error:', logError);
      return NextResponse.json({ error: 'Failed to create job log' }, { status: 500 });
    }

    const jobId: string = logRow.id;

    // ── Fire-and-forget: call /api/process ─────────────────────────────────
    // We don't await so the upload response returns immediately.
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, pdfUrl }),
    }).catch((err) => {
      console.error(`[Upload] Failed to trigger process for job ${jobId}:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      pdfUrl,
      message: 'Upload successful. Processing started.',
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
