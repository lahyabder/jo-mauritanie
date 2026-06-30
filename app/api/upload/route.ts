import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pdfUrlInput = formData.get('pdfUrl') as string | null;
    const language = formData.get('language') as string || 'ar';
    const issueNumber = formData.get('issueNumber') as string | null;

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
      // ── Ensure bucket exists (auto-create if missing) ───────────────────────
      const BUCKET = 'gazette-pdfs';
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.id === BUCKET);
      if (!bucketExists) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: 52428800, // 50 MB
          allowedMimeTypes: ['application/pdf'],
        });
        if (createErr) {
          console.error('Failed to create storage bucket:', createErr);
          return NextResponse.json(
            { error: `Storage bucket creation failed: ${createErr.message}` },
            { status: 500 }
          );
        }
      }

      // ── Upload to Supabase Storage ─────────────────────────────────────────
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const storageKey = `${Date.now()}_${fileName}`;
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, bytes, { contentType: 'application/pdf', upsert: true });

      if (storageError) {
        console.error('Storage upload error:', storageError);
        return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
      }

      // Get public URL
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
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
      return NextResponse.json({
        error: 'Failed to create job log',
        debug: { code: logError.code, message: logError.message, details: logError.details, hint: logError.hint }
      }, { status: 500 });
    }

    const jobId: string = logRow.id;

    // ── Kick off processing in background (kept alive by waitUntil) ───────────
    const baseUrl = req.nextUrl.origin;
    waitUntil(
      fetch(`${baseUrl}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, pdfUrl, language, issueNumber }),
      }).catch((err) => {
        console.error(`[Upload] Failed to trigger process for job ${jobId}:`, err);
      })
    );

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
