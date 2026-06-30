import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const numStr = url.searchParams.get('issueNumber');
    const language = url.searchParams.get('language') || 'ar'; // Default to ar if not provided
    
    if (!numStr) {
      return NextResponse.json({ exists: false });
    }

    const issueNumber = parseInt(numStr, 10);
    if (isNaN(issueNumber) || issueNumber <= 0) {
      return NextResponse.json({ exists: false });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('issues')
      .select('id, issue_number, is_published, language')
      .eq('issue_number', issueNumber)
      .eq('language', language)
      .maybeSingle();

    if (error) {
      console.error('Error checking issue:', error);
      return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: !!data, issue: data });
  } catch (err: any) {
    console.error('Check issue error:', err);
    return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
  }
}
