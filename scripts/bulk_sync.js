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

// Directories based on user input
const OS = require('os');
const DESKTOP_DIR = path.join(OS.homedir(), 'Desktop', 'JournalOfficiel');
const FOLDERS_TO_PROCESS = [
  { path: path.join(DESKTOP_DIR, 'AR'), lang: 'ar' },
  { path: path.join(DESKTOP_DIR, 'FR'), lang: 'fr' }
];

const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'progress.json');

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
}

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

async function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { processedFiles: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function processFile(filePath, fileName) {
  console.log(`\n--- Processing ${fileName} ---`);
  
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  
  console.log(`Loaded PDF: ${pageCount} pages`);
  
  const CHUNK_SIZE = 30;
  let extracted = { issue: {}, documents: [], persons: [], institutions: [], appointments: [] };
  
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 65536,
      temperature: 0.1,
    },
  });

  for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
    const endPage = Math.min(i + CHUNK_SIZE, pageCount);
    console.log(`  Processing pages ${i + 1} to ${endPage}...`);
    
    const chunkDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx);
    const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => chunkDoc.addPage(page));

    const chunkBytes = await chunkDoc.save();
    const chunkBase64 = Buffer.from(chunkBytes).toString('base64');
    
    let rawText = '';
    const maxRetries = 10; // High retry limit for background local process
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent([
          { inlineData: { mimeType: 'application/pdf', data: chunkBase64 } },
          MASTER_EXTRACTION_PROMPT,
        ]);
        rawText = result.response.text();
        console.log(`    Chunk processed successfully (${rawText.length} chars)`);
        break;
      } catch (apiErr) {
        const msg = String(apiErr?.message ?? '');
        if (msg.includes('429') || msg.includes('503') || apiErr?.status === 429 || apiErr?.status === 503) {
          const waitSecs = Math.min(60 * (attempt + 1), 300); // Wait 1min, 2min, up to 5min
          console.log(`    Rate limited (429/503). Sleeping for ${waitSecs} seconds before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, waitSecs * 1000));
        } else {
          throw apiErr;
        }
      }
    }
    
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      const chunkExtracted = JSON.parse(cleaned);
      
      if (i === 0 && chunkExtracted.issue) extracted.issue = chunkExtracted.issue;
      
      const prefix = `c${i}_`;
      const docs = chunkExtracted.documents || [];
      docs.forEach((d) => { d.local_id = prefix + d.local_id; });
      extracted.documents.push(...docs);

      const persons = chunkExtracted.persons || [];
      persons.forEach((p) => { p.local_id = prefix + p.local_id; });
      extracted.persons.push(...persons);

      const insts = chunkExtracted.institutions || [];
      insts.forEach((ins) => { ins.local_id = prefix + ins.local_id; });
      extracted.institutions.push(...insts);

      const appts = chunkExtracted.appointments || [];
      appts.forEach((a) => {
        if (a.document_local_id) a.document_local_id = prefix + a.document_local_id;
        if (a.person_local_id) a.person_local_id = prefix + a.person_local_id;
        if (a.institution_local_id) a.institution_local_id = prefix + a.institution_local_id;
      });
      extracted.appointments.push(...appts);
    } catch (e) {
      console.error(`    Parse error on chunk ${i + 1}-${endPage}:`, String(e));
      console.log(`    Raw output preview: ${rawText.substring(0, 500)}`);
      throw new Error(`Parse failed for chunk ${i + 1}-${endPage}`);
    }
  }
  
  return extracted;
}

async function insertToSupabase(extracted, fileName) {
  console.log(`  Inserting data into Supabase for ${fileName}...`);
  
  // Create issue
  let issueId;
  const { issue } = extracted;
  
  // Extract language from filename if missing
  const lang = fileName.includes('-fr') ? 'fr' : 'ar';
  
  let issueNum = issue?.issue_number?.toString() || fileName.match(/-(\d+)(?:-ar|-fr)?/)?.[1] || '0';
  let yearMatch = fileName.match(/-(\d{4})-/)?.[1];
  let year = issue?.year || parseInt(yearMatch || '2024');
  let pubDate = issue?.published_date && issue.published_date.length === 10 ? issue.published_date : `${year}-01-01`;
  
  const { data: issueRow, error: issueErr } = await supabase
    .from('issues')
    .insert({
      issue_number: parseInt(issueNum),
      language: lang,
      publication_date: pubDate,
      source_url: `local_bulk/${fileName}`,
      is_published: true
    })
    .select().single();
    
  if (issueErr) {
    console.error('  Failed to create issue:', issueErr);
    return false;
  }
  
  issueId = issueRow.id;
  console.log(`  Issue created: ${issueId}`);

  // Rest of insertion logic...
  // Map local IDs to UUIDs
  const docIdMap = {};
  const instIdMap = {};
  const perIdMap = {};

  // Insert documents
  for (const doc of (extracted.documents || [])) {
    const { data: dRow, error: dErr } = await supabase.from('documents').insert({
      issue_id: issueId,
      type: doc.type || 'other',
      official_number: doc.official_number,
      title_ar: doc.title_ar,
      title_fr: doc.title_fr,
      short_title_ar: doc.short_title_ar,
      page_start: doc.page_start,
      page_end: doc.page_end,
      published_date: doc.published_date || pubDate,
      language: doc.language || lang,
      original_text: doc.original_text,
      ai_summary_ar: doc.ai_summary_ar,
      keywords: doc.keywords || [],
      status: doc.status || 'active',
      confidence_score: doc.confidence_score
    }).select().single();
    
    if (dErr) console.error(`  Failed doc ${doc.local_id}:`, dErr.message);
    else docIdMap[doc.local_id] = dRow.id;
  }

  // Insert institutions
  for (const ins of (extracted.institutions || [])) {
    if (!ins.official_name_ar) continue;
    
    // Check if institution exists
    const { data: existingIns } = await supabase
      .from('institutions')
      .select('id')
      .eq('name_ar', ins.official_name_ar)
      .limit(1)
      .single();
      
    if (existingIns) {
      instIdMap[ins.local_id] = existingIns.id;
    } else {
      const { data: iRow, error: iErr } = await supabase.from('institutions').insert({
        name_ar: ins.official_name_ar,
        name_fr: ins.official_name_fr,
        category: ins.type === 'ministry' ? 'ministry' : 'other',
        is_active: ins.status === 'active'
      }).select().single();
      
      if (iErr) console.error(`  Failed institution ${ins.local_id}:`, iErr.message);
      else instIdMap[ins.local_id] = iRow.id;
    }
  }

  // Insert persons
  for (const per of (extracted.persons || [])) {
    if (!per.full_name_ar) continue;
    
    // Check if person exists
    const { data: existingPer } = await supabase
      .from('persons')
      .select('id')
      .eq('full_name_ar', per.full_name_ar)
      .limit(1)
      .single();
      
    if (existingPer) {
      perIdMap[per.local_id] = existingPer.id;
    } else {
      const { data: pRow, error: pErr } = await supabase.from('persons').insert({
        full_name_ar: per.full_name_ar,
        full_name_fr: per.full_name_fr,
        gender: (per.gender === 'male' || per.gender === 'female') ? (per.gender === 'male' ? 'M' : 'F') : null,
        current_role_title_ar: per.current_position_ar,
        person_role: 'other'
      }).select().single();
      
      if (pErr) console.error(`  Failed person ${per.local_id}:`, pErr.message);
      else perIdMap[per.local_id] = pRow.id;
    }
  }

  // Insert appointments
  let apptsInserted = 0;
  for (const appt of (extracted.appointments || [])) {
    const pid = perIdMap[appt.person_local_id];
    const iid = instIdMap[appt.institution_local_id];
    const did = docIdMap[appt.document_local_id];
    
    if (pid && iid && did) {
      const { error: aErr } = await supabase.from('appointments').insert({
        person_id: pid,
        institution_id: iid,
        document_id: did,
        position_title_ar: appt.position_title_ar,
        position_title_fr: appt.position_title_fr,
        appointment_type: appt.appointment_type || 'nomination',
        appointment_date: appt.appointment_date || pubDate,
        is_current: appt.is_current ?? true,
        confidence: appt.confidence
      });
      if (aErr) console.error(`  Failed appointment:`, aErr.message);
      else apptsInserted++;
    }
  }

  console.log(`  Done! Inserted ${Object.keys(docIdMap).length} docs, ${Object.keys(instIdMap).length} insts, ${Object.keys(perIdMap).length} persons, ${apptsInserted} appts.`);
  return true;
}

async function checkIfIssueExists(fileName, lang) {
  let issueNum = fileName.match(/-(\d+)(?:-ar|-fr)?/)?.[1] || '0';
  
  const { data, error } = await supabase
    .from('issues')
    .select('id')
    .eq('issue_number', parseInt(issueNum))
    .eq('language', lang)
    .limit(1);
    
  if (error) {
    console.error(`Error checking DB for issue ${fileName}:`, error.message);
    return false;
  }
  return data && data.length > 0;
}

async function processDirectory(dirObj, progress) {
  const dirPath = dirObj.path;
  const lang = dirObj.lang;
  
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }
  
  console.log(`\n=== Scanning ${dirPath} ===`);
  const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith('.pdf'));
  
  if (files.length === 0) {
    console.log(`No PDF files found in ${dirPath}.`);
    return;
  }

  // Create processed subdirectory inside Desktop
  const processedDir = path.join(dirPath, 'Processed');
  if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
  
  for (const file of files) {
    if (progress.processedFiles.includes(file)) {
      console.log(`Skipping ${file} (already in progress.json)`);
      continue;
    }
    
    // Check if issue exists in database
    const existsInDb = await checkIfIssueExists(file, lang);
    if (existsInDb) {
      console.log(`Skipping ${file} (already exists in database)`);
      progress.processedFiles.push(file);
      saveProgress(progress);
      // Move to processed folder to clean up desktop
      fs.renameSync(path.join(dirPath, file), path.join(processedDir, file));
      continue;
    }
    
    const filePath = path.join(dirPath, file);
    try {
      const extracted = await processFile(filePath, file);
      // Ensure language is correct
      if (!extracted.issue) extracted.issue = {};
      extracted.issue.language = lang;
      
      const success = await insertToSupabase(extracted, file);
      
      if (success) {
        // Move file to processed folder
        fs.renameSync(filePath, path.join(processedDir, file));
        
        progress.processedFiles.push(file);
        saveProgress(progress);
        console.log(`Successfully completed and moved ${file}`);
      }
    } catch (err) {
      console.error(`\nERROR processing ${file}:`, err.message);
      console.log(`Skipping to next file...`);
    }
  }
}

async function main() {
  console.log("Starting Bulk PDF Processing...");
  const progress = await loadProgress();
  
  for (const dirObj of FOLDERS_TO_PROCESS) {
    await processDirectory(dirObj, progress);
  }
  
  console.log("\nAll files processed!");
}

main().catch(console.error);
