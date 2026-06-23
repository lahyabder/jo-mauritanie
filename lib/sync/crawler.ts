// lib/sync/crawler.ts
// Automated crawler for the Mauritanian Official Gazette website

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { processUploadJob } from '../processing/pipeline';

const TARGET_URL = 'https://msgg.gov.mr/ar/ar-droit-mauritanien/le-journal-officiel-ar.html';
const BASE_URL = 'https://msgg.gov.mr';

export async function runAutoSync(triggerType: 'cron' | 'manual' | 'webhook' = 'cron', userId?: string) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // 1. Create Sync Log Entry
  const { data: logEntry, error: logError } = await supabase.from('sync_logs').insert({
    trigger_type: triggerType,
    triggered_by: userId || null,
    status: 'running'
  }).select('id').single();

  if (logError || !logEntry) {
    console.error("Failed to create sync log entry", logError);
    return;
  }

  const syncId = logEntry.id;
  let issuesFound = 0;
  let newIssuesDownloaded = 0;

  try {
    // 2. Fetch remote page
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Observatoire-JO-Bot/1.0',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`Remote server returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 3. Parse HTML (This selector depends heavily on the actual msgg.gov.mr structure)
    // Assuming standard table format: <tr> <td>Date</td> <td>Issue Number</td> <td><a href="pdf">Link</a></td> </tr>
    const rows = $('table tr');
    
    if (rows.length === 0) {
      // Structure changed!
      throw new Error('LAYOUT_CHANGED: Could not find table rows containing issues.');
    }

    for (const row of rows) {
      const columns = $(row).find('td');
      if (columns.length < 3) continue; // Skip headers or malformed rows

      // Highly dependent on actual HTML structure:
      // Let's assume Col 0 is Date, Col 1 is Issue Number, Col 2 is the Link
      const dateText = $(columns[0]).text().trim();
      const issueText = $(columns[1]).text().trim();
      const link = $(columns[2]).find('a').attr('href');

      if (!issueText || !link) continue;

      const issueNumberMatch = issueText.match(/(\d+)/);
      if (!issueNumberMatch) continue;
      
      const issueNumber = parseInt(issueNumberMatch[1], 10);
      const pdfUrl = link.startsWith('http') ? link : `${BASE_URL}${link.startsWith('/') ? link : '/' + link}`;

      issuesFound++;

      // 4. Check idempotency (does it exist?)
      const { data: existingIssue } = await supabase
        .from('issues')
        .select('id')
        .eq('issue_number', issueNumber)
        .limit(1);

      if (existingIssue && existingIssue.length > 0) {
        continue; // Already processed
      }

      // 5. It's a new issue! Download it.
      console.log(`[Sync ${syncId}] Found new issue: N° ${issueNumber}. Downloading...`);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        console.warn(`[Sync ${syncId}] Failed to download PDF for issue ${issueNumber}`);
        continue;
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // 6. Upload to Supabase Storage
      const fileName = `JO_${issueNumber}_${Date.now()}.pdf`;
      const filePath = `auto_sync/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gazettes')
        .upload(filePath, pdfBuffer, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error(`[Sync ${syncId}] Failed to upload issue ${issueNumber} to storage:`, uploadError);
        continue;
      }

      // 7. Create Upload Job
      const { data: job } = await supabase.from('upload_jobs').insert({
        original_filename: `JO_N_${issueNumber}.pdf`,
        pdf_storage_path: filePath,
        pdf_file_size_bytes: pdfBuffer.byteLength,
        status: 'pending',
        current_step_label: 'Auto-sync download complete',
        detected_issue_number: issueNumber
      }).select('id').single();

      if (job) {
        newIssuesDownloaded++;
        // 8. Trigger the background extraction pipeline asynchronously
        processUploadJob(job.id).catch(e => console.error(`Pipeline err for job ${job.id}`, e));
      }
    }

    // 9. Mark Sync Success
    await supabase.from('sync_logs').update({
      status: 'completed_success',
      completed_at: new Date().toISOString(),
      issues_found: issuesFound,
      new_issues_downloaded: newIssuesDownloaded
    }).eq('id', syncId);

  } catch (error: any) {
    console.error(`[Sync ${syncId}] Failed:`, error);
    
    const isLayoutError = error.message && error.message.includes('LAYOUT_CHANGED');
    
    await supabase.from('sync_logs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      site_reachable: !error.message?.includes('fetch'),
      layout_changed: isLayoutError,
      error_message: error.message,
      error_details: { stack: error.stack }
    }).eq('id', syncId);

    // In a real app, send email/Slack alert to Admins here if layout_changed === true
  }
}
