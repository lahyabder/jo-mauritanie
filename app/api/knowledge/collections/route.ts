import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const code = searchParams.get('code');
    const id = searchParams.get('id');

    // If a specific collection is requested, return it with its linked documents
    if (code || id) {
      let query = supabase.from('document_collections').select('*');
      if (id) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', code);
      }

      const { data: collection, error: colError } = await query.single();
      if (colError || !collection) {
        return NextResponse.json({ error: colError?.message || 'Collection not found' }, { status: 404 });
      }

      // Fetch documents inside this collection
      const { data: docs, error: docsError } = await supabase
        .from('collection_documents')
        .select('relevance_score, order_index, documents(*)')
        .eq('collection_id', collection.id)
        .order('order_index', { ascending: true });

      if (docsError) {
        return NextResponse.json({ error: docsError.message }, { status: 500 });
      }

      return NextResponse.json({
        ...collection,
        documents: docs.map((d: any) => ({
          ...d.documents,
          relevance_score: d.relevance_score,
          order_index: d.order_index
        }))
      });
    }

    // Otherwise return all collections
    const { data: collections, error: colsError } = await supabase
      .from('document_collections')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('title_ar', { ascending: true });

    if (colsError) {
      return NextResponse.json({ error: colsError.message }, { status: 500 });
    }

    return NextResponse.json(collections);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
