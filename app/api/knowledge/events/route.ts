import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const eventType = searchParams.get('event_type');
    const documentId = searchParams.get('document_id');
    const personId = searchParams.get('person_id');
    const institutionId = searchParams.get('institution_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('legal_events')
      .select('*, documents(id, title_ar, type, official_number), persons(id, full_name_ar), institutions(id, official_name_ar)')
      .order('event_date', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (documentId) {
      query = query.eq('document_id', documentId);
    }
    if (personId) {
      query = query.eq('person_id', personId);
    }
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
