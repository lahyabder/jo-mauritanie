// lib/sync/crawler.ts
// Automated crawler for the Mauritanian Official Gazette website

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { processIssueCore } from '@/app/api/process/route';
import { scrapeIssues, ScrapedIssue } from '../scraper';

export async function runAutoSync(triggerType: 'cron' | 'manual' | 'webhook' = 'cron', userId?: string) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const syncId = `cron_${Date.now()}`;
  let issuesFound = 0;
  let newIssuesDownloaded = 0;

  try {
    const scrapedAr = await scrapeIssues('ar');
    const scrapedFr = await scrapeIssues('fr');
    const allScraped = [...scrapedAr, ...scrapedFr];
    issuesFound = allScraped.length;

    for (const issue of allScraped) {
      // 4. Check idempotency (does it exist in issues table?)
      const { data: existingIssue } = await supabase
        .from('issues')
        .select('id')
        .eq('issue_number', issue.issueNumber)
        .eq('language', issue.language)
        .limit(1);

      if (existingIssue && existingIssue.length > 0) {
        continue; // Already processed and published
      }

      // 4b. Check if it's currently processing or failed recently in sync_logs
      const { data: existingLog } = await supabase
        .from('sync_logs')
        .select('status')
        .ilike('file_name', `JO_${issue.language}_${issue.issueNumber}_%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        const status = existingLog[0].status;
        if (status === 'success' || status === 'completed' || status === 'processing' || status === 'error' || status === 'failed') {
          continue; // Already processed or failed (skip to next to avoid infinite loop)
        }
      }

      // Instead of relying on upload_jobs queue, we process it synchronously here
      const fileName = `JO_${issue.language}_${issue.issueNumber}_${Date.now()}.pdf`;

      // 7. Create Sync Log Entry for this specific issue processing
      const { data: logEntry, error: logError } = await supabase.from('sync_logs').insert({
        file_name: fileName,
        pdf_url: issue.pdfUrl,
        status: 'processing'
      }).select('id').single();

      if (logEntry) {
        newIssuesDownloaded++;
        try {
          console.log(`[Sync ${syncId}] Starting AI Extraction for Issue N° ${issue.issueNumber} (${issue.language})...`);
          await processIssueCore(logEntry.id, issue.pdfUrl, issue.language, issue.issueNumber);
          console.log(`[Sync ${syncId}] Successfully processed issue ${issue.issueNumber}`);
        } catch (e) {
          console.error(`[Sync ${syncId}] Failed to process issue ${issue.issueNumber}:`, e);
          // Error is already logged in sync_logs by processIssueCore
        }
      }

      // We break here to process ONLY ONE issue per cron execution
      // This prevents serverless timeouts. The next cron run will pick up the next issue.
      break;
    }

    // 9. Mark Sync Success (Logged to console since we removed top-level sync_log)
    console.log(`[Sync ${syncId}] Completed. Found: ${issuesFound}, Downloaded: ${newIssuesDownloaded}`);

  } catch (error: any) {
    console.error(`[Sync ${syncId}] Failed:`, error);
  }
}
