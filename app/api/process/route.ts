import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';

// ─────────────────────────────────────────────────────────────────────────────
// Vercel: max duration for this route (Pro plan allows up to 300s)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
const MASTER_EXTRACTION_PROMPT = `أنت نظام استخراج بيانات متخصص في تحليل الجريدة الرسمية الموريتانية.
لديك الملف الكامل لعدد من الجريدة الرسمية.

════════════════════════════════════════════════════════
QUI INCLURE dans persons (sector: "state"):
  SEULEMENT les personnes ayant des fonctions gouvernementales officielles
  (ministre, directeur, juge, gouverneur, ambassadeur, officier, fonctionnaire...)
  Nommés, révoqués ou mutés par décret ou décision officielle.
  NE PAS inclure: fondateurs d'associations, membres de conseils d'ONG, commerçants.
  ATTENTION CRITIQUE: Le champ "full_name_ar" DOIT contenir un vrai nom humain (ex: محمد ولد أحمد). NE JAMAIS y mettre un titre ou une fonction (ex: وزير, المدير العام). Si le nom humain n'est pas mentionné, N'AJOUTEZ PAS la personne.

QUI INCLURE dans institutions (sector: "state"):
  SEULEMENT les organismes gouvernementaux: ministères, tribunaux, agences, conseils, wilayas, communes.
  NE PAS inclure: associations, syndicats, partis politiques, sociétés privées, ONG.

TOUS LES documents doivent être inclus (même les notifs d'associations).
  Pour les documents relatifs aux associations: type="notification", keywords=["جمعية"] أو ["نقابة"].
════════════════════════════════════════════════════════
قواعد تقنية:
1. جميع الوثائق دون استثناء.
2. لكل شخص حكومي مُعيَّن أو مُعفى أو مُنقَّل: سجل في persons وappointments.
3. ربط كل تعيين بالشخص والمؤسسة والوثيقة عبر local_id.
4. التواريخ دائماً YYYY-MM-DD.
5. original_text: ملخص 2-3 جمل فقط (لا تنسخ النص الكامل).
6. يمنع منعاً باتاً الترجمة! استخرج النص بلغته الأصلية فقط. ضع النص العربي في حقول _ar والفرنسي في حقول _fr واترك الأخرى null.
7. JSON فقط دون أي نص إضافي.

{
  "issue": {
    "issue_number": 1234,
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
      "title_ar": "العنوان الكامل للوثيقة",
      "title_fr": "Titre en français si présent",
      "short_title_ar": "عنوان مختصر",
      "page_start": 1,
      "page_end": 3,
      "published_date": "YYYY-MM-DD",
      "language": "ar",
      "original_text": "ملخص مختصر 2-3 جمل عن محتوى الوثيقة",
      "ai_summary_ar": "ملخص موجز لا يتجاوز سطرين",
      "keywords": ["كلمة1", "كلمة2"],
      "status": "active",
      "confidence_score": 0.95
    }
  ],
  "persons": [
    {
      "local_id": "per_1",
      "full_name_ar": "الاسم الكامل كما ورد في النص",
      "full_name_fr": "Nom en français si présent",
      "gender": "male|female|unknown",
      "current_position_ar": "المنصب الحكومي الحالي",
      "sector": "state"
    }
  ],
  "institutions": [
    {
      "local_id": "inst_1",
      "official_name_ar": "الاسم الرسمي للمؤسسة",
      "official_name_fr": "Nom officiel en français",
      "type": "ministry|court|agency|committee|enterprise|council|other",
      "status": "active"
    }
  ],
  "appointments": [
    {
      "person_local_id": "per_1",
      "institution_local_id": "inst_1",
      "document_local_id": "doc_1",
      "position_title_ar": "المنصب المعين فيه",
      "position_title_fr": "Poste en français",
      "appointment_type": "nomination|dismissal|transfer|promotion|decoration",
      "appointment_date": "YYYY-MM-DD",
      "is_current": true,
      "confidence": 0.95
    }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────────
async function updateLog(supabase: any, jobId: string, patch: Record<string, any>) {
  await supabase.from('sync_logs').update(patch).eq('id', jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
export async function processIssueCore(jobId: string, pdfUrl: string, language: string = 'ar', providedIssueNumber?: string) {
  const supabase = createAdminClient();

  try {
    if (!jobId || !pdfUrl) {
      throw new Error('jobId and pdfUrl are required');
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      await updateLog(supabase, jobId, { status: 'error', error_message: 'GEMINI_API_KEY not configured' });
      throw new Error('GEMINI_API_KEY not configured on server');
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
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    console.log(`[Process ${jobId}] Downloaded ${pdfBuffer.byteLength} bytes`);

    // ── Step 2: Load PDF and prepare chunking ────────────────────────────────
    console.log(`[Process ${jobId}] Loading PDF with pdf-lib...`);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`[Process ${jobId}] PDF has ${pageCount} pages`);

    const CHUNK_SIZE = 30; // Pages per chunk
    let extracted: any = { issue: {}, documents: [], persons: [], institutions: [], appointments: [] };

    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 65536,
        temperature: 0.1,
      },
    });

    // ── Step 3 & 4: Process chunks and parse JSON ────────────────────────────
    for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
      const endPage = Math.min(i + CHUNK_SIZE, pageCount);
      console.log(`[Process ${jobId}] Processing chunk: pages ${i + 1} to ${endPage} of ${pageCount}`);

      const chunkDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx);
      const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => chunkDoc.addPage(page));

      const chunkBytes = await chunkDoc.save();
      const chunkBase64 = Buffer.from(chunkBytes).toString('base64');

      let rawText = '';
      const maxRetries = 3;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await model.generateContent([
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: chunkBase64,
              },
            },
            MASTER_EXTRACTION_PROMPT,
          ]);
          rawText = result.response.text();
          console.log(`[Process ${jobId}] Chunk ${i + 1}-${endPage} response: ${rawText.length} chars`);
          break;
        } catch (apiErr: any) {
          const msg = String(apiErr?.message ?? '');
          const isRetryable = msg.includes('429') || msg.includes('503') || apiErr?.status === 429 || apiErr?.status === 503;
          if (isRetryable && attempt < maxRetries) {
            const waitSecs = 3 * (attempt + 1); // Reduced backoff to avoid Vercel timeout
            console.log(`[Process ${jobId}] Rate limited — waiting ${waitSecs}s before retry ${attempt + 1}/${maxRetries}...`);
            await new Promise((r) => setTimeout(r, waitSecs * 1000));
          } else {
            let userErrorMsg = msg;
            if (msg.includes('429')) {
              userErrorMsg = 'تم تجاوز الحد المسموح به للذكاء الاصطناعي (نفاد الرصيد أو كثرة الطلبات). يرجى التحقق من مفتاح API.';
            }
            throw new Error(`${userErrorMsg} \nOriginal Error: ${msg}`);
          }
        }
      }

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
        const chunkExtracted = JSON.parse(cleaned);

        if (i === 0 && chunkExtracted.issue) {
          extracted.issue = chunkExtracted.issue;
        }

        const prefix = `c${i}_`;

        const docs = chunkExtracted.documents || [];
        docs.forEach((d: any) => { d.local_id = prefix + d.local_id; });
        extracted.documents.push(...docs);

        const persons = chunkExtracted.persons || [];
        persons.forEach((p: any) => { p.local_id = prefix + p.local_id; });
        extracted.persons.push(...persons);

        const insts = chunkExtracted.institutions || [];
        insts.forEach((ins: any) => { ins.local_id = prefix + ins.local_id; });
        extracted.institutions.push(...insts);

        const appts = chunkExtracted.appointments || [];
        appts.forEach((a: any) => {
          if (a.document_local_id) a.document_local_id = prefix + a.document_local_id;
          if (a.person_local_id) a.person_local_id = prefix + a.person_local_id;
          if (a.institution_local_id) a.institution_local_id = prefix + a.institution_local_id;
        });
        extracted.appointments.push(...appts);

      } catch (e) {
        console.error(`[Process ${jobId}] JSON parse error on chunk ${i + 1}-${endPage}:`, String(e).slice(0, 300));
        await updateLog(supabase, jobId, {
          error_details: { parse_error: String(e), raw_preview: rawText.substring(0, 1000) }
        });
        throw new Error(`فشل تحليل استجابة الذكاء الاصطناعي في الجزء من الصفحة ${i + 1}. الرجاء المحاولة مرة أخرى.`);
      }
    }

    // ── Step 5: Update sync_log with counts ──────────────────────────────────
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

    console.log(`[Process ${jobId}] Totals: ${docCount} docs, ${personCount} persons, ${instCount} insts, ${apptCount} appts`);

    // ── Step 6: Upsert issue ──────────────────────────────────────────────────
    let issueId: string | null = null;

    let parsedIssueNumber = providedIssueNumber ? parseInt(providedIssueNumber, 10) : NaN;
    
    if (isNaN(parsedIssueNumber) || parsedIssueNumber <= 0) {
      parsedIssueNumber = parseInt(String(issueData.issue_number).replace(/\D/g, ''), 10);
    }
    
    if (isNaN(parsedIssueNumber) || parsedIssueNumber <= 0) {
      const urlWithoutYears = pdfUrl.replace(/\b(19|20)\d{2}\b/g, '');
      const fallbackMatch = urlWithoutYears.match(/-(\d{1,5})-ar\.pdf$/i) || urlWithoutYears.match(/jo.*?-(\d{1,5})/i) || urlWithoutYears.match(/\b(\d{3,5})\b/);
      if (fallbackMatch && fallbackMatch[1]) {
        parsedIssueNumber = parseInt(fallbackMatch[1], 10);
      }
    }

    if (!isNaN(parsedIssueNumber) && parsedIssueNumber > 0) {
      const today = new Date().toISOString().split('T')[0];

      const { data: existingIssue } = await supabase.from('issues')
        .select('id')
        .eq('issue_number', parsedIssueNumber)
        .eq('language', language)
        .maybeSingle();
      if (existingIssue) {
        console.log(`[Process ${jobId}] Deleting old documents for issue ${parsedIssueNumber}...`);
        await supabase.from('documents').delete().eq('issue_id', existingIssue.id);
        await supabase.from('appointment_history').delete().eq('instrument_issue_id', existingIssue.id);
      }

      let issueRow;
      const { data: existingIssueLang } = await supabase
        .from('issues')
        .select('*')
        .eq('issue_number', parsedIssueNumber)
        .eq('language', language)
        .maybeSingle();

      if (existingIssueLang) {
        const { data: updatedRow, error: updateErr } = await supabase
          .from('issues')
          .update({
            publication_date: issueData.published_date ?? today,
            pdf_url: pdfUrl,
            pdf_page_count: pageCount || null,
            is_published: true,
            edition_note_en: `docs:${docCount} persons:${personCount} insts:${instCount} appts:${apptCount}`,
          })
          .eq('id', existingIssueLang.id)
          .select('id')
          .single();
        if (updateErr) throw new Error(`Failed to update issue: ${updateErr.message}`);
        issueRow = updatedRow;
      } else {
        const { data: newRow, error: insertErr } = await supabase
          .from('issues')
          .insert({
            issue_number: parsedIssueNumber,
            publication_date: issueData.published_date ?? today,
            language: language as any,
            pdf_url: pdfUrl,
            pdf_page_count: pageCount || null,
            is_published: true,
            edition_note_en: `docs:${docCount} persons:${personCount} insts:${instCount} appts:${apptCount}`,
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(`Failed to insert issue: ${insertErr.message}`);
        issueRow = newRow;
      }

      issueId = issueRow?.id ?? null;
      console.log(`[Process ${jobId}] Issue upserted: ${issueId}`);
    } else {
      throw new Error('Could not determine issue_number from extraction or filename.');
    }

    const today = new Date().toISOString().split('T')[0];

    // ── Step 7: Upsert persons ────────────────────────────────────────────────
    const personIdMap: Record<string, string> = {};
    for (const p of extracted.persons ?? []) {
      if (!p.full_name_ar && !p.full_name_fr) continue;
      
      const searchName = p.full_name_ar || p.full_name_fr;
      const { data: existingP } = await supabase.from('persons').select('id').eq(p.full_name_ar ? 'full_name_ar' : 'full_name_fr', searchName).maybeSingle();
      let pId = existingP?.id;
      if (!pId) {
        const { data: pRow, error: pErr } = await supabase
          .from('persons')
          .insert({
            full_name_ar: p.full_name_ar ?? null,
            full_name_fr: p.full_name_fr ?? null,
            gender: (p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : null) as any,
            current_role_title_ar: p.current_position_ar ?? null,
            current_role_title_fr: p.current_position_fr ?? null,
            is_active: true,
          } as any)
          .select('id')
          .single();
        if (pErr) console.error(`[Process ${jobId}] Person insert error:`, pErr.message);
        pId = pRow?.id;
      }
      if (pId) personIdMap[p.local_id] = pId;
    }

    // ── Step 8: Upsert institutions ───────────────────────────────────────────
    const instIdMap: Record<string, string> = {};
    const validCategories = ['ministry', 'presidency', 'parliament', 'constitutional_council', 'supreme_court',
      'court_of_audit', 'public_enterprise', 'authority', 'commission', 'agency',
      'military', 'security', 'regional_council', 'municipality', 'international_org', 'ngo', 'other'];

    for (const inst of extracted.institutions ?? []) {
      if (!inst.official_name_ar && !inst.official_name_fr) continue;
      
      const searchName = inst.official_name_ar || inst.official_name_fr;
      const { data: existingI } = await supabase.from('institutions').select('id').eq(inst.official_name_ar ? 'name_ar' : 'name_fr', searchName).maybeSingle();
      let iId = existingI?.id;
      if (!iId) {
        let mappedCategory = validCategories.includes(inst.type) ? inst.type : 'other';
        if (inst.type === 'agency' || inst.type === 'commission') mappedCategory = 'authority';
        
        const { data: iRow, error: iErr } = await supabase
          .from('institutions')
          .insert({
            name_ar: inst.official_name_ar ?? null,
            name_fr: inst.official_name_fr ?? null,
            category: mappedCategory as any,
            is_active: true,
          } as any)
          .select('id')
          .single();
        if (iErr) console.error(`[Process ${jobId}] Inst insert error:`, iErr.message);
        iId = iRow?.id;
      }
      if (iId) instIdMap[inst.local_id] = iId;
    }

    // ── Step 9: Insert documents ──────────────────────────────────────────────
    const docIdMap: Record<string, string> = {};
    for (const doc of extracted.documents ?? []) {
      if ((!doc.title_ar && !doc.title_fr) || !issueId) continue;
      const { data: dRow, error: dErr } = await supabase
        .from('documents')
        .insert({
          issue_id: issueId,
          type: (doc.type ?? 'other') as any,
          official_number: doc.official_number ?? null,
          title_ar: doc.title_ar ?? null,
          title_fr: doc.title_fr ?? null,
          document_date: doc.published_date ?? issueData.published_date ?? today,
          original_language: language as any,
          content_ar: doc.original_text && language !== 'fr' ? doc.original_text : null,
          content_fr: doc.original_text && language === 'fr' ? doc.original_text : null,
          ai_summary_ar: language !== 'fr' ? doc.ai_summary_ar : null,
          pdf_page_start: doc.page_start ?? null,
          status: 'published' as any,
          is_current_version: true,
          is_confidential: false,
        })
        .select('id')
        .single();
      if (dErr) console.error(`[Process ${jobId}] Doc insert error:`, dErr.message);
      if (dRow?.id) docIdMap[doc.local_id] = dRow.id;
    }

    // ── Step 10: Insert appointment_history ───────────────────────────────────
    const safeDate = (d: any) => {
      if (!d || d === 'YYYY-MM-DD' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return today;
      return d;
    };
    const validApptTypes = ['nomination', 'promotion', 'transfer', 'termination', 'retirement'];

    for (const appt of extracted.appointments ?? []) {
      const personId = personIdMap[appt.person_local_id];
      if (!personId) {
        console.warn(`[Process ${jobId}] Skipped appt: no personId for ${appt.person_local_id}`);
        continue;
      }
      const instId = instIdMap[appt.institution_local_id] || null;
      const docId = docIdMap[appt.document_local_id] || null;

      const { error: apptErr } = await supabase.from('appointment_history').insert({
        person_id: personIdMap[appt.person_local_id],
        institution_id: instIdMap[appt.institution_local_id] ?? null,
        instrument_document_id: docIdMap[appt.document_local_id],
        instrument_issue_id: issueId,
        position_title_ar: appt.position_title_ar ?? null,
        position_title_fr: appt.position_title_fr ?? null,
        appointment_type: (appt.appointment_type ?? 'nomination') as any,
        appointment_date: safeDate(appt.appointment_date),
        is_current: appt.is_current ?? true,
        confidence: appt.confidence ?? 1.0,
      } as any);
      if (apptErr) console.error(`[Process ${jobId}] Appt insert error:`, apptErr.message);
    }

    // ── Step 11: Mark complete ────────────────────────────────────────────────
    await updateLog(supabase, jobId, {
      status: 'completed',
      issue_id: issueId,
      completed_at: new Date().toISOString(),
      ai_model_used: 'gemini-2.5-flash',
      extraction_version: '4.0.0',
    });

    console.log(`[Process ${jobId}] ✅ Completed`);
    return { success: true, jobId, docCount, personCount, instCount, apptCount };

  } catch (err: any) {
    console.error(`[Process ${jobId}] ERROR:`, err);
    if (jobId) {
      const supabase2 = createAdminClient();
      let errorMsg = String(err?.message ?? err).slice(0, 500);
      if (errorMsg.includes('429')) errorMsg = 'تم تجاوز الحد المسموح به للذكاء الاصطناعي. ' + errorMsg;
      if (errorMsg.includes('404')) errorMsg = 'النموذج المستخدم غير متاح. ' + errorMsg;
      await updateLog(supabase2, jobId, {
        status: 'error',
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jobId = body.jobId as string;
    const pdfUrl = body.pdfUrl as string;
    const language = body.language || 'ar';
    const providedIssueNumber = body.issueNumber as string | undefined;

    const result = await processIssueCore(jobId, pdfUrl, language, providedIssueNumber);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Processing failed' }, { status: 500 });
  }
}
