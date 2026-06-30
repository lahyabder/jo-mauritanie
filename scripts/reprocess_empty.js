const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PDFDocument } = require('pdf-lib');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genai = new GoogleGenerativeAI(geminiApiKey);

const OS = require('os');
const DESKTOP_DIR = path.join(OS.homedir(), 'Desktop', 'JournalOfficiel');

const MASTER_EXTRACTION_PROMPT = `أنت خبير أرشيف متخصص في قراءة الجريدة الرسمية الموريتانية القديمة جداً (فترة 1959 وما بعدها).
الملف المرفق هو لعدد قديم، قد يكون الخط سيئاً أو ممسوحاً ضوئياً بجودة ضعيفة.
**مهمتك المحددة:**
حتى لو كان النص غير واضح تماماً، حاول استخراج العناوين الرئيسية للقرارات والمراسيم والقوانين والتعيينات.
لا تترك القائمة فارغة. ابحث عن أي نص يشبه "مرسوم رقم..." أو "قرار..." أو "تعيين...".
استخرج ما تستطيع بأقصى جهد.

قواعد تقنية:
1. JSON فقط دون أي نص إضافي.
2. التواريخ يفضل أن تكون YYYY-MM-DD وإذا لم تكن واضحة ضع تاريخ العدد.
3. في حال لم تتمكن من قراءة التفاصيل، اكتفِ بكتابة العنوان المستنتج في title_ar.

{
  "documents": [
    {
      "local_id": "doc_1",
      "type": "law|decree|regulation|decision|circular|notification|announcement|appointment|other",
      "official_number": "استنتجه إن أمكن",
      "title_ar": "عنوان الوثيقة (بأكبر قدر ممكن من الدقة)",
      "original_text": "جزء من النص إن أمكن قراءته",
      "ai_summary_ar": "ملخص مستنتج",
      "keywords": ["تاريخي", "أرشيف"]
    }
  ]
}`;

async function main() {
  console.log("=== Starting Reprocess of Empty Issues ===");
  
  // 1. Fetch issues with 0 documents
  const { data: allIssues, error } = await supabase
    .from('issues')
    .select('id, issue_number, publication_date, language, source_url, documents(id)');
    
  if (error) {
    console.error("Failed to fetch issues:", error);
    return;
  }
  
  const emptyIssues = allIssues.filter(i => !i.documents || i.documents.length === 0);
  console.log(`Found ${emptyIssues.length} issues with 0 documents.`);
  
  if (emptyIssues.length === 0) {
    console.log("Nothing to reprocess. Exiting.");
    return;
  }

  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 65536,
      temperature: 0.4, // slightly higher temperature to encourage guessing on bad OCR
    },
  });

  for (const issue of emptyIssues) {
    console.log(`\n>>> Reprocessing Issue N° ${issue.issue_number} (${issue.language})`);
    
    // Construct local path
    // source_url is like "local_bulk/mauritanie-jo-1959-10-ar.pdf"
    const fileName = issue.source_url.replace('local_bulk/', '');
    
    const possiblePaths = [
      path.join(DESKTOP_DIR, 'AR', 'Processed', fileName),
      path.join(DESKTOP_DIR, 'AR', fileName),
      path.join(DESKTOP_DIR, 'FR', 'Processed', fileName),
      path.join(DESKTOP_DIR, 'FR', fileName),
    ];
    
    let filePath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }
    
    if (!filePath) {
      console.log(`  File not found on disk: ${fileName}`);
      continue;
    }
    
    console.log(`  Reading ${filePath}...`);
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    const CHUNK_SIZE = 15; // smaller chunks for older files to improve focus
    let extractedDocs = [];
    
    for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
      const endPage = Math.min(i + CHUNK_SIZE, pageCount);
      console.log(`  Processing pages ${i + 1} to ${endPage}...`);
      
      const chunkDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx);
      const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => chunkDoc.addPage(page));

      const chunkBytes = await chunkDoc.save();
      const chunkBase64 = Buffer.from(chunkBytes).toString('base64');
      
      const maxRetries = 10;
      let rawText = '';
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await model.generateContent([
            { inlineData: { mimeType: 'application/pdf', data: chunkBase64 } },
            MASTER_EXTRACTION_PROMPT,
          ]);
          rawText = result.response.text();
          break; // Success
        } catch (err) {
          const msg = String(err?.message ?? '');
          if (msg.includes('429') || msg.includes('503') || err?.status === 429 || err?.status === 503) {
            const waitSecs = Math.min(60 * (attempt + 1), 300);
            console.log(`    Rate limited (429/503). Sleeping for ${waitSecs} seconds before retry ${attempt + 1}/${maxRetries}...`);
            await new Promise((r) => setTimeout(r, waitSecs * 1000));
          } else {
            console.error(`  Error generating content for pages ${i+1}-${endPage}:`, err.message);
            break; // Other error, break loop
          }
        }
      }
      
      if (!rawText) continue;

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
        
        const chunkExtracted = JSON.parse(cleaned);
        if (chunkExtracted.documents && chunkExtracted.documents.length > 0) {
          extractedDocs.push(...chunkExtracted.documents);
        }
      } catch (err) {
        console.error(`  Parse Error on pages ${i+1}-${endPage}:`, err.message);
      }
    }
    
    if (extractedDocs.length > 0) {
      console.log(`  Successfully extracted ${extractedDocs.length} documents! Inserting to DB...`);
      for (const doc of extractedDocs) {
        const { error: dErr } = await supabase.from('documents').insert({
          issue_id: issue.id,
          type: doc.type || 'other',
          official_number: doc.official_number,
          title_ar: doc.title_ar,
          title_fr: doc.title_fr,
          document_date: issue.publication_date,
          original_language: issue.language,
          original_text: doc.original_text,
          ai_summary_ar: doc.ai_summary_ar,
          status: 'active'
        });
        if (dErr) console.error(`    Failed to insert doc:`, dErr.message);
      }
      console.log(`  Insertion complete for Issue ${issue.issue_number}.`);
    } else {
      console.log(`  AI still could not find any documents in Issue ${issue.issue_number}.`);
    }
  }
  
  console.log("\n=== Reprocessing Finished ===");
}

main().catch(console.error);
