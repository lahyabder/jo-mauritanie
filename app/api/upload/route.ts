import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string; // Ideally extracted from session token

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase.from('sync_logs').insert([
      { file_name: file.name, status: 'processing' }
    ]).select().single();

    if (error) {
       console.error('Supabase error:', error);
       return NextResponse.json({ error: 'Failed to create job log' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      jobId: data.id,
      message: 'Upload successful. Processing started.'
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
