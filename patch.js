const fs = require('fs');
let code = fs.readFileSync('app/api/process/route.ts', 'utf8');

code = code.replace("import { GoogleGenerativeAI } from '@google/generative-ai';", "import { GoogleGenerativeAI } from '@google/generative-ai';\nimport { PDFDocument } from 'pdf-lib';");

const oldLogic = `    // ── Step 2: Count pages using pdf-parse (for metadata only) ──────────────
    let pageCount = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse');
      const pdfData = await pdfParse(Buffer.from(pdfBuffer));
      pageCount = pdfData.numpages;
      console.log(\`[Process \${jobId}] PDF has \${pageCount} pages\`);
    } catch {
      console.warn(\`[Process \${jobId}] Could not count pages, continuing...\`);
    }

    // ── Step 3: Send FULL PDF to Gemini in ONE request ────────────────────────
    // This avoids chunking, rate limits, and JSON truncation issues entirely.
    console.log(\`[Process \${jobId}] Sending full PDF to Gemini as inline data (single request)...\`);

    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 65536,
        temperature: 0.1,
      },
    });

    let rawText = '';
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          MASTER_EXTRACTION_PROMPT,
        ]);
        rawText = result.response.text();
        console.log(\`[Process \${jobId}] Got response: \${rawText.length} chars\`);
        break;
      } catch (apiErr: any) {
        const msg = String(apiErr?.message ?? '');
        const isRetryable = msg.includes('429') || msg.includes('503') || apiErr?.status === 429 || apiErr?.status === 503;
        if (isRetryable && attempt < maxRetries) {
          const waitSecs = 60 * (attempt + 1);
          console.log(\`[Process \${jobId}] Rate limited — waiting \${waitSecs}s before retry \${attempt + 1}/\${maxRetries}...\`);
          await new Promise((r) => setTimeout(r, waitSecs * 1000));
        } else {
          throw apiErr;
        }
      }
    }

    // ── Step 4: Parse JSON response ──────────────────────────────────────────
    let extracted: any = { issue: {}, documents: [], persons: [], institutions: [], appointments: [] };
    try {
      const jsonMatch = rawText.match(/\\{[\\s\\S]*\\}/);
      let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^\\`\\`\\`json\\s*/i, '').replace(/\\`\\`\\`\\s*$/i, '').trim();
      cleaned = cleaned.replace(/,\\s*([}\\]])/g, '$1');
      extracted = JSON.parse(cleaned);
      console.log(\`[Process \${jobId}] Parsed: \${extracted.documents?.length || 0} docs, \${extracted.persons?.length || 0} persons, \${extracted.appointments?.length || 0} appts\`);
    } catch (e) {
      console.error(\`[Process \${jobId}] JSON parse error:\`, String(e).slice(0, 300));
      await updateLog(supabase, jobId, {
        error_details: { parse_error: String(e), raw_preview: rawText.substring(0, 1000) }
      });
      throw new Error(\`فشل تحليل استجابة الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.\`);
    }`;

const newLogic = `    // ── Step 2: Load PDF and prepare chunking ────────────────────────────────
    console.log(\`[Process \${jobId}] Loading PDF with pdf-lib...\`);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(\`[Process \${jobId}] PDF has \${pageCount} pages\`);

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
      console.log(\`[Process \${jobId}] Processing chunk: pages \${i + 1} to \${endPage} of \${pageCount}\`);

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
          console.log(\`[Process \${jobId}] Chunk \${i + 1}-\${endPage} response: \${rawText.length} chars\`);
          break;
        } catch (apiErr: any) {
          const msg = String(apiErr?.message ?? '');
          const isRetryable = msg.includes('429') || msg.includes('503') || apiErr?.status === 429 || apiErr?.status === 503;
          if (isRetryable && attempt < maxRetries) {
            const waitSecs = 10 * (attempt + 1); // Reduced backoff
            console.log(\`[Process \${jobId}] Rate limited — waiting \${waitSecs}s before retry \${attempt + 1}/\${maxRetries}...\`);
            await new Promise((r) => setTimeout(r, waitSecs * 1000));
          } else {
            throw apiErr;
          }
        }
      }

      try {
        const jsonMatch = rawText.match(/\\{[\\s\\S]*\\}/);
        let cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/^\\`\\`\\`json\\s*/i, '').replace(/\\`\\`\\`\\s*$/i, '').trim();
        cleaned = cleaned.replace(/,\\s*([}\\]])/g, '$1');
        const chunkExtracted = JSON.parse(cleaned);

        if (i === 0 && chunkExtracted.issue) {
          extracted.issue = chunkExtracted.issue;
        }

        const prefix = \`c\${i}_\`;

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
        console.error(\`[Process \${jobId}] JSON parse error on chunk \${i + 1}-\${endPage}:\`, String(e).slice(0, 300));
        await updateLog(supabase, jobId, {
          error_details: { parse_error: String(e), raw_preview: rawText.substring(0, 1000) }
        });
        throw new Error(\`فشل تحليل استجابة الذكاء الاصطناعي في الجزء من الصفحة \${i + 1}. الرجاء المحاولة مرة أخرى.\`);
      }
    }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('app/api/process/route.ts', code);
console.log('Patched');
