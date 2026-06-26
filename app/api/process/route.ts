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
4. أعد JSON فقط — لا تعليقات ولا نصوص إضافية.
5. بالنسبة لـ issue_number أعد قيمة رقمية (مثلا 1456) أو null إن لم تجدها.`;

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

    console.log(`[Process ${jobId}] Downloaded ${pdfBuffer.byteLength} bytes`);

    // ── Step 2: Extract text from PDF using pdf-parse ────────────────────────
    console.log(`[Process ${jobId}] Extracting text from PDF...`);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse');
    const pdfData = await pdfParse(Buffer.from(pdfBuffer));
    const extractedText = pdfData.text;
    const pageCount = pdfData.numpages;
    console.log(`[Process ${jobId}] Extracted ${extractedText.length} chars from ${pageCount} pages`);

    if (!extractedText || extractedText.trim().length < 100) {
      throw new Error('PDF text extraction failed or PDF has too little text content');
    }

    const model = genai.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.1
      }
    });

    // ── Step 3: Chunking & AI Extraction ──────────────────────────────────────
    // Split text into chunks to avoid token limits (reduce to 10000 chars ~ 3-4 pages to prevent JSON cutoff!)
    const CHUNK_SIZE = 10000;
    const textChunks: string[] = [];
    for (let i = 0; i < extractedText.length; i += CHUNK_SIZE) {
      textChunks.push(extractedText.slice(i, i + CHUNK_SIZE));
    }
    console.log(`[Process ${jobId}] Split text into ${textChunks.length} chunks (preventing output token limit).`);

    const extracted: any = {
      issue: {},
      documents: [],
      persons: [],
      institutions: [],
      appointments: []
    };

    const maxRetries = 3;
    
    try {
      for (let c = 0; c < textChunks.length; c++) {
        console.log(`[Process ${jobId}] Sending chunk ${c + 1}/${textChunks.length} to Gemini...`);
        let chunkResult: any;
        let success = false;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            chunkResult = await model.generateContent([
              `هذا الجزء رقم ${c + 1} من ${textChunks.length} للنص المستخرج من الجريدة الرسمية:\n\n${textChunks[c]}`,
              MASTER_EXTRACTION_PROMPT,
            ]);
            success = true;
            break; // success
          } catch (apiErr: any) {
            const isRetryable = apiErr?.status === 429 || apiErr?.status === 503 || String(apiErr?.message).includes('429') || String(apiErr?.message).includes('503');
            if (isRetryable && attempt < maxRetries) {
              console.log(`[Process ${jobId}] Rate limit or 503 hit — waiting 30s before retry ${attempt + 1}/${maxRetries}...`);
              await new Promise((r) => setTimeout(r, 30000));
            } else {
              throw apiErr;
            }
          }
        }
        
        if (success && chunkResult) {
          const rawText = chunkResult.response.text();
          let chunkJson: any;
          try {
            // Robust parsing with regex fallback
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            // Remove trailing commas which are invalid in JSON but common in LLM output
            cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
            chunkJson = JSON.parse(cleaned);
            console.log(`[Process ${jobId}] Chunk ${c + 1} parsed successfully. Found ${chunkJson.documents?.length || 0} documents.`);
          } catch (e) {
            console.error(`[Process ${jobId}] CRITICAL: Failed to parse JSON for chunk ${c + 1}. error:`, String(e).slice(0, 200));
            
            // Log full output so we can debug token limits or hallucination
            await updateLog(supabase, jobId, {
                error_details: { chunk_error: String(e), chunk_index: c, raw_preview: rawText.substring(0, 500) }
            });

            continue; // Skip chunk if unparseable to avoid crashing entire pipeline
          }
          
          // Safely merge arrays
          if (chunkJson.issue && chunkJson.issue.issue_number && Object.keys(extracted.issue).length === 0) {
            extracted.issue = chunkJson.issue;
          }
          if (Array.isArray(chunkJson.documents)) extracted.documents.push(...chunkJson.documents);
          if (Array.isArray(chunkJson.persons)) extracted.persons.push(...chunkJson.persons);
          if (Array.isArray(chunkJson.institutions)) extracted.institutions.push(...chunkJson.institutions);
          if (Array.isArray(chunkJson.appointments)) extracted.appointments.push(...chunkJson.appointments);
        }

        // Calculate progress percentage and save to DB
        const chunkProgress = Math.round(((c + 1) / textChunks.length) * 100);
        await updateLog(supabase, jobId, {
          error_details: { chunk_progress: chunkProgress }
        });

        // Add small delay between chunks to avoid rate limiting (Gemini free tier has 15 RPM, so 4s delay is safe)
        if (c < textChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4500));
        }
      }
    } catch (err: any) {
      // Translate common API errors to Arabic
      let translatedMsg = err.message || 'حدث خطأ غير معروف في خادم الذكاء الاصطناعي';
      const msgStr = String(err.message);
      
      if (msgStr.includes('429') || err.status === 429) {
        translatedMsg = 'تم تجاوز الحد المسموح به للذكاء الاصطناعي، يرجى المحاولة لاحقاً';
      } else if (msgStr.includes('404') || err.status === 404) {
        translatedMsg = 'النموذج المستخدم غير متاح، يرجى التواصل مع المسؤول التقني';
      } else if (msgStr.includes('500') || err.status === 500) {
        translatedMsg = 'حدث خطأ في الخادم، يرجى المحاولة مرة أخرى';
      }
      
      throw new Error(translatedMsg);
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

    console.log(`[Process ${jobId}] Extracted Total: ${docCount} docs, ${personCount} persons, ${instCount} institutions`);

    // Upsert issue — only valid columns from the issues table
    let issueId: string | null = null;
    
    // Parse issue_number safely
    let parsedIssueNumber = parseInt(String(issueData.issue_number).replace(/\D/g, ''), 10);
    if (isNaN(parsedIssueNumber) || parsedIssueNumber <= 0) {
      // Fallback: extract from pdfUrl (e.g. 1782343867271_mauritanie-jo-2026-1606-ar.pdf -> 1606)
      const fallbackMatch = pdfUrl.match(/-(\d{1,5})-ar\.pdf$/i) || pdfUrl.match(/jo.*?-(\d{1,5})/i);
      if (fallbackMatch && fallbackMatch[1]) {
        parsedIssueNumber = parseInt(fallbackMatch[1], 10);
        console.log(`[Process ${jobId}] Extracted issue_number ${parsedIssueNumber} from URL fallback.`);
      }
    }

    if (!isNaN(parsedIssueNumber) && parsedIssueNumber > 0) {
      console.log(`[Process ${jobId}] Upserting issue...`);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingIssue } = await supabase.from('issues').select('id').eq('issue_number', parsedIssueNumber).maybeSingle();
      if (existingIssue) {
        console.log(`[Process ${jobId}] Issue already exists. Deleting old documents to prevent duplicates...`);
        await supabase.from('documents').delete().eq('issue_id', existingIssue.id);
      }
      
      const { data: issueRow, error: issueErr } = await supabase
        .from('issues')
        .upsert({
          issue_number: parsedIssueNumber,
          publication_date: issueData.published_date ?? today, // NOT NULL
          pdf_url: pdfUrl,
          pdf_page_count: pageCount || null, // total pages
          is_published: true,  // ← required by RLS public read policy
        }, { onConflict: 'issue_number' })
        .select('id')
        .single();
      if (issueErr) {
        console.error(`[Process ${jobId}] Issue upsert error:`, issueErr.message);
        throw new Error(`Failed to upsert issue: ${issueErr.message}`); // Fail early if issue cannot be created
      }
      issueId = issueRow?.id ?? null;
      console.log(`[Process ${jobId}] Issue upserted with ID: ${issueId}`);
    } else {
       throw new Error("Could not determine a valid issue_number from extraction or filename.");
    }

    // Upsert persons
    const personIdMap: Record<string, string> = {};
    for (const p of extracted.persons ?? []) {
      if (!p.full_name_ar) continue;
      
      let pId = null;
      const { data: existingP } = await supabase
        .from('persons')
        .select('id')
        .eq('full_name_ar', p.full_name_ar)
        .maybeSingle();
        
      if (existingP?.id) {
        pId = existingP.id;
      } else {
        const { data: pRow, error: pErr } = await supabase
          .from('persons')
          .insert({
            full_name_ar: p.full_name_ar,
            full_name_fr: p.full_name_fr ?? null,
            gender: (p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : null) as any,
            current_role_title_ar: p.current_position_ar ?? null,
            is_active: true,
          } as any)
          .select('id')
          .single();
          
        if (pErr) console.error(`[Process ${jobId}] Person insert error for ${p.full_name_ar}:`, pErr.message);
        pId = pRow?.id;
      }
      if (pId) personIdMap[p.local_id] = pId;
    }

    // Upsert institutions
    const instIdMap: Record<string, string> = {};
    for (const inst of extracted.institutions ?? []) {
      if (!inst.official_name_ar) continue;
      
      let iId = null;
      const { data: existingI } = await supabase
        .from('institutions')
        .select('id')
        .eq('name_ar', inst.official_name_ar)
        .maybeSingle();
        
      if (existingI?.id) {
        iId = existingI.id;
      } else {
        // Safely map category to enum, default to 'other'
        const validCategories = ['ministry', 'presidency', 'parliament', 'constitutional_council', 'supreme_court', 'court_of_audit', 'public_enterprise', 'authority', 'commission', 'agency', 'military', 'security', 'regional_council', 'municipality', 'international_org', 'ngo', 'other'];
        const mappedCategory = validCategories.includes(inst.type) ? inst.type : 'other';

        const { data: iRow, error: iErr } = await supabase
          .from('institutions')
          .insert({
            name_ar: inst.official_name_ar,
            name_fr: inst.official_name_fr ?? null,
            category: mappedCategory as any,
            is_active: true,
          } as any)
          .select('id')
          .single();
          
        if (iErr) console.error(`[Process ${jobId}] Inst insert error for ${inst.official_name_ar}:`, iErr.message);
        iId = iRow?.id;
      }
      if (iId) instIdMap[inst.local_id] = iId;
    }

    // Insert documents — using correct schema column names
    const docIdMap: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];
    for (const doc of extracted.documents ?? []) {
      if (!doc.title_ar) continue;
      if (!issueId) { console.warn(`[Process ${jobId}] Skipping doc (no issueId): ${doc.title_ar}`); continue; }
      const { data: dRow, error: dErr } = await supabase
        .from('documents')
        .insert({
          issue_id: issueId,
          type: (doc.type ?? 'other') as any,               // ← correct column name
          official_number: doc.official_number ?? null,
          title_ar: doc.title_ar,
          title_fr: doc.title_fr ?? null,
          document_date: doc.published_date ?? issueData.published_date ?? today, // NOT NULL
          original_language: (doc.language === 'fr' ? 'fr' : 'ar') as any,       // ← correct column name
          content_ar: doc.language !== 'fr' ? (doc.original_text ?? null) : null, // ← correct column name
          content_fr: doc.language === 'fr' ? (doc.original_text ?? null) : null,
          ai_summary_ar: doc.ai_summary_ar ?? null,
          status: 'published' as any,        // ← RLS requires 'published'
          is_current_version: true,          // ← RLS requires TRUE
          is_confidential: false,
        })
        .select('id')
        .single();
      if (dErr) console.error(`[Process ${jobId}] Doc insert error:`, dErr.message);
      if (dRow?.id) docIdMap[doc.local_id] = dRow.id;
    }

    // Upsert appointments
    for (const appt of extracted.appointments ?? []) {
      const personId = personIdMap[appt.person_local_id];
      const instId = instIdMap[appt.institution_local_id];
      const docId = docIdMap[appt.document_local_id];
      
      const personData = extracted.persons?.find((p: any) => p.local_id === appt.person_local_id);
      
      if (!personId || !instId) continue;
      
      const validApptTypes = ['nomination', 'promotion', 'transfer', 'termination', 'retirement'];
      const mappedApptType = validApptTypes.includes(appt.appointment_type) ? appt.appointment_type : 'nomination';
      
      const { error: apptErr } = await supabase.from('appointment_history').insert({
        person_id: personId,
        institution_id: instId,
        instrument_document_id: docId ?? null,
        instrument_issue_id: issueId,
        position_title_ar: appt.position_title_ar ?? 'بدون منصب',
        position_title_fr: appt.position_title_fr ?? null,
        appointment_type: mappedApptType,
        appointment_date: appt.appointment_date ?? today,
        is_current: appt.is_current ?? true,
        confidence: appt.confidence ?? 1.0,
      });
      
      if (apptErr) {
        console.error(`[Process ${jobId}] Appt insert error:`, apptErr.message);
      }
    }

    // ── Step 6: Mark complete ─────────────────────────────────────────────────
    await updateLog(supabase, jobId, {
      status: 'completed',
      issue_id: issueId,
      completed_at: new Date().toISOString(),
      ai_model_used: 'gemini-flash-lite-latest',
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
