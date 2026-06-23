import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const cardType = searchParams.get('card_type');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required parameters: entity_type and entity_id' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('knowledge_cards')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (cardType) {
      query = query.eq('card_type', cardType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
