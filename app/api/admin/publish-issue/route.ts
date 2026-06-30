import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/admin/publish-issue
 * Body: { issue_id: string } OR { publish_all: true }
 *
 * Publishes an issue and all its documents so they pass the RLS
 * public read policy:
 *   issues:   is_published = TRUE
 *   documents: status = 'published', is_current_version = TRUE, is_confidential = FALSE
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { issue_id, publish_all } = body;

    if (!issue_id && !publish_all) {
      return NextResponse.json({ error: 'Missing issue_id or publish_all flag' }, { status: 400 });
    }

    let updatedIssues = 0;
    let updatedDocs = 0;

    if (publish_all) {
      // ── Publish ALL unpublished issues ───────────────────────────────────────
      const { data: issues } = await supabase
        .from('issues')
        .update({ is_published: true })
        .eq('is_published', false)
        .select('id');

      updatedIssues = issues?.length ?? 0;

      // Publish ALL draft/unpublished documents
      const { data: docs } = await supabase
        .from('documents')
        .update({
          status: 'published',
          is_current_version: true,
          is_confidential: false,
        })
        .neq('status', 'published')
        .select('id');

      updatedDocs = docs?.length ?? 0;

    } else {
      // ── Publish a specific issue ──────────────────────────────────────────────
      const { error: issueErr } = await supabase
        .from('issues')
        .update({ is_published: true })
        .eq('id', issue_id);

      if (issueErr) {
        return NextResponse.json({ error: `Issue update failed: ${issueErr.message}` }, { status: 500 });
      }
      updatedIssues = 1;

      // Publish all documents that belong to this issue
      const { data: docs, error: docErr } = await supabase
        .from('documents')
        .update({
          status: 'published',
          is_current_version: true,
          is_confidential: false,
        })
        .eq('issue_id', issue_id)
        .select('id');

      if (docErr) {
        return NextResponse.json({ error: `Documents update failed: ${docErr.message}` }, { status: 500 });
      }
      updatedDocs = docs?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      updated_issues: updatedIssues,
      updated_documents: updatedDocs,
      message: `Published ${updatedIssues} issue(s) and ${updatedDocs} document(s).`,
    });

  } catch (err: any) {
    console.error('[publish-issue] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/publish-issue
 * Returns all issues with their publication status and document count.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: issues, error } = await supabase
      .from('issues')
      .select(`
        id,
        issue_number,
        language,
        publication_date,
        is_published,
        pdf_url,
        documents ( count )
      `)
      .order('publication_date', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count documents per issue broken down by status
    const enriched = await Promise.all((issues ?? []).map(async (issue) => {
      const { count: publishedCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('issue_id', issue.id)
        .eq('status', 'published');

      const { count: totalCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('issue_id', issue.id);

      return {
        ...issue,
        total_documents: totalCount ?? 0,
        published_documents: publishedCount ?? 0,
      };
    }));

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/publish-issue
 * Body: { issue_id: string }
 * Deletes an issue and its associated documents, appointments, etc.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { issue_id } = body;

    if (!issue_id) {
      return NextResponse.json({ error: 'Missing issue_id' }, { status: 400 });
    }

    // Because 'documents' has ON DELETE RESTRICT on issue_id, we must delete documents first.
    // 'documents' deletion will cascade to appointment_history (if ON DELETE CASCADE is set for instrument_document_id)
    // Actually, to be safe, delete appointment_history explicitly first
    await supabase.from('appointment_history').delete().eq('instrument_issue_id', issue_id);
    
    // Delete documents
    await supabase.from('documents').delete().eq('issue_id', issue_id);
    
    // Delete sync logs
    await supabase.from('sync_logs').delete().eq('issue_id', issue_id);
    
    // Delete the issue itself
    const { error: issueErr } = await supabase.from('issues').delete().eq('id', issue_id);

    if (issueErr) {
      return NextResponse.json({ error: `Failed to delete issue: ${issueErr.message}` }, { status: 500 });
    }

    // --- Clean up orphan persons and institutions ---
    
    // Clean orphan persons
    const { data: orphanPersons } = await supabase
      .from('persons')
      .select('id, appointment_history!left(id)');
      
    const orphanPersonIds = (orphanPersons || [])
      .filter((p: any) => !p.appointment_history || p.appointment_history.length === 0)
      .map((p: any) => p.id);
      
    if (orphanPersonIds.length > 0) {
      await supabase.from('persons').delete().in('id', orphanPersonIds);
    }
    
    // Clean orphan institutions
    const { data: orphanInstitutions } = await supabase
      .from('institutions')
      .select('id, appointment_history!left(id)');
      
    const orphanInstIds = (orphanInstitutions || [])
      .filter((i: any) => !i.appointment_history || i.appointment_history.length === 0)
      .map((i: any) => i.id);
      
    if (orphanInstIds.length > 0) {
      await supabase.from('institutions').delete().in('id', orphanInstIds);
    }

    return NextResponse.json({ success: true, message: 'Issue and all related documents deleted successfully.' });
  } catch (err: any) {
    console.error('[delete-issue] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
