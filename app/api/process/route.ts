import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────────────────────
// Vercel: max duration for this route (Pro plan allows up to 300s)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt: same as Python pipeline MASTER_EXTRACTION_PROMPT
const MASTER_EXTRACTION_PROMPT = `أنت نظام استخراج بيانات متخصص في القانون الموريتاني. لديك كامل الجريدة الرسمية الموريتانية المرفقة.

مهمتك استخراج جميع البيانات بصيغة JSON منظّمة ودقيقة للغاية. اتبع الهيكل التالي حرفياً:

{
  "issue": {
    "issue_number": "رقم العدد",
    "published_date": "YYYY-MM-DD",
    "year": 2024,
    "month": 6,
    "language": "ar"
  },
  "documents": [
    {
      "local_id": "doc_1",
      "type": "law|decree|regulation|decision|circular|notification|announcement|appointment",
      "official_number": "2024-019",
      "title_ar": "العنوان الكامل",
      "title_fr": "Titre en français si présent",
      "short_title_ar": "عنوان مختصر",
      "page_start": 1,
      "page_end": 3,
      "published_date": "YYYY-MM-DD",
      "language": "ar",
      "original_text": "النص الكامل للوثيقة",
      "ai_summary_ar": "ملخص موجز لا يتجاوز 3 أسطر",
      "keywords": ["كلمة1", "كلمة2"],
      "status": "active",
      "confidence_score": 0.95
    }
  ],
  "persons": [
    {
      "local_id": "per_1",
      "full_name_ar": "الاسم الكامل",
      "full_name_fr": "Nom en français",
      "gender": "male|female|unknown",
      "current_position_ar": "المنصب الحالي"
    }
  ],
  "institutions": [
    {
      "local_id": "inst_1",
      "official_name_ar": "الاسم الرسمي",
      "official_name_fr": "Nom officiel en français",
      "type": "ministry|court|agency|committee|enterprise|council",
      "status": "active"
    }
  ],
  "appointments": [
    {
      "person_local_id": "per_1",
      "institution_local_id": "inst_1",
      "document_local_id": "doc_1",
      "position_title_ar": "المنصب",
      "position_title_fr": "Poste en français",
      "appointment_type": "appointment|dismissal|transfer|delegation|decoration",
      "appointment_date": "YYYY-MM-DD",
      "is_current": true,
      "confidence": 0.95
    }
  ]
}

قواعد صارمة:
1. كل وثيقة يجب أن يكون لها local_id فريد (doc_1, doc_2, ...).
2. التواريخ دائماً بصيغة YYYY-MM-DD.
3. confidence_score بين 0.0 و 1.0.
4. أعد JSON فقط — لا تعليقات ولا نصوص إضافية.`;

// ─────────────────────────────────────────────────────────────────────────────
async function updateLog(supabase: any, jobId: string, patch: Record<string, any>) {
  await supabase.from('sync_logs').update(patch).eq('id', jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let jobId: string | null = null;

  try {
    const body = await req.json();
    jobId = body.jobId as string;
    const pdfUrl: string = body.pdfUrl; // Supabase Storage public URL or external URL

    if (!jobId || !pdfUrl) {
      return NextResponse.json({ error: 'jobId and pdfUrl are required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      await updateLog(supabase, jobId, { status: 'error', error_message: 'GEMINI_API_KEY not configured' });
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured on server' }, { status: 500 });
    }

    const genai = new GoogleGenerativeAI(geminiKey);

    // ── Step 1: Download PDF ──────────────────────────────────────────────────
    await updateLog(supabase, jobId, { status: 'processing' });

    console.log(`[Process ${jobId}] Downloading PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    console.log(`[Process ${jobId}] Downloaded ${pdfBuffer.byteLength} bytes`);

    // ── Step 2: Use Gemini inline data (base64) ───────────────────────────────
    // @google/generative-ai doesn't have a Files API wrapper — use inline base64
    console.log(`[Process ${jobId}] Sending PDF to Gemini (inline)...`);
    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // ── Step 3: Run AI Extraction ─────────────────────────────────────────────
    console.log(`[Process ${jobId}] Running Gemini extraction...`);

    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
      MASTER_EXTRACTION_PROMPT,
    ]);

    const rawText = result.response.text();

    let extracted: any;
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      extracted = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Gemini returned invalid JSON: ${String(e).slice(0, 200)}`);
    }

    // ── Step 4: Update sync_log with counts ───────────────────────────────────
    const docCount = extracted.documents?.length ?? 0;
    const personCount = extracted.persons?.length ?? 0;
    const instCount = extracted.institutions?.length ?? 0;
    const apptCount = extracted.appointments?.length ?? 0;
    const issueData = extracted.issue ?? {};

    await updateLog(supabase, jobId, {
      documents_extracted: docCount,
      persons_extracted: personCount,
      institutions_extracted: instCount,
      appointments_extracted: apptCount,
    });

    console.log(`[Process ${jobId}] Extracted: ${docCount} docs, ${personCount} persons, ${instCount} institutions`);

    // ── Step 5: Commit to DB ──────────────────────────────────────────────────
    // Upsert issue
    let issueId: string | null = null;
    if (issueData.issue_number) {
      const { data: issueRow } = await supabase
        .from('issues')
        .upsert({
          issue_number: issueData.issue_number,
          publication_date: issueData.published_date ?? null,
          year: issueData.year ?? null,
          month: issueData.month ?? null,
          language: issueData.language ?? 'ar',
          status: 'published' as any,
          pdf_url: pdfUrl,
        } as any, { onConflict: 'issue_number' })
        .select('id')
        .single();
      issueId = issueRow?.id ?? null;
    }

    // Upsert persons
    const personIdMap: Record<string, string> = {};
    for (const p of extracted.persons ?? []) {
      if (!p.full_name_ar) continue;
      const { data: pRow } = await supabase
        .from('persons')
        .upsert({
          full_name_ar: p.full_name_ar,
          full_name_fr: p.full_name_fr ?? null,
          gender: (p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : null) as any,
          current_position_ar: p.current_position_ar ?? null,
          is_active: true,
        } as any, { onConflict: 'full_name_ar' })
        .select('id')
        .single();
      if (pRow?.id) personIdMap[p.local_id] = pRow.id;
    }

    // Upsert institutions
    const instIdMap: Record<string, string> = {};
    for (const inst of extracted.institutions ?? []) {
      if (!inst.official_name_ar) continue;
      const { data: iRow } = await supabase
        .from('institutions')
        .upsert({
          name_ar: inst.official_name_ar,
          name_fr: inst.official_name_fr ?? null,
          category: (inst.type ?? 'other') as any,
          is_active: true,
        } as any, { onConflict: 'name_ar' })
        .select('id')
        .single();
      if (iRow?.id) instIdMap[inst.local_id] = iRow.id;
    }

    // Upsert documents
    const docIdMap: Record<string, string> = {};
    for (const doc of extracted.documents ?? []) {
      if (!doc.title_ar) continue;
      const { data: dRow } = await supabase
        .from('documents')
        .insert({
          issue_id: issueId,
          doc_type: (doc.type ?? 'other') as any,
          official_number: doc.official_number ?? null,
          title_ar: doc.title_ar,
          title_fr: doc.title_fr ?? null,
          short_title_ar: doc.short_title_ar ?? null,
          publication_date: doc.published_date ?? issueData.published_date ?? null,
          language: doc.language ?? 'ar',
          original_text: doc.original_text ?? null,
          ai_summary_ar: doc.ai_summary_ar ?? null,
          status: 'active' as any,
          confidence_score: doc.confidence_score ?? null,
        } as any)
        .select('id')
        .single();
      if (dRow?.id) docIdMap[doc.local_id] = dRow.id;
    }

    // Upsert appointments
    for (const appt of extracted.appointments ?? []) {
      const personId = personIdMap[appt.person_local_id];
      const instId = instIdMap[appt.institution_local_id];
      const docId = docIdMap[appt.document_local_id];
      if (!personId || !instId) continue;
      await supabase.from('appointments').insert({
        person_id: personId,
        institution_id: instId,
        document_id: docId ?? null,
        position_title_ar: appt.position_title_ar ?? null,
        position_title_fr: appt.position_title_fr ?? null,
        appointment_type: (appt.appointment_type ?? 'appointment') as any,
        appointment_date: appt.appointment_date ?? null,
        is_current: appt.is_current ?? true,
        confidence_score: appt.confidence ?? null,
      } as any);
    }

    // ── Step 6: Mark complete ─────────────────────────────────────────────────
    await updateLog(supabase, jobId, {
      status: 'completed',
      issue_id: issueId,
      completed_at: new Date().toISOString(),
      ai_model_used: 'gemini-2.5-pro',
      extraction_version: '3.0.0',
    });

    // (No file cleanup needed for inline base64 approach)

    console.log(`[Process ${jobId}] ✅ Completed`);
    return NextResponse.json({ success: true, jobId, docCount, personCount, instCount });

  } catch (err: any) {
    console.error(`[Process ${jobId}] ERROR:`, err);
    if (jobId) {
      const supabase2 = createAdminClient();
      await updateLog(supabase2, jobId, {
        status: 'error',
        error_message: String(err?.message ?? err).slice(0, 500),
        completed_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ error: err?.message ?? 'Processing failed' }, { status: 500 });
  }
}
