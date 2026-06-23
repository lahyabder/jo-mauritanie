import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const centerId = searchParams.get('center_id'); // original entity ID, e.g., document_id or person_id
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (centerId) {
      // Find the corresponding node in kg_nodes
      const { data: centerNode, error: nodeError } = await supabase
        .from('kg_nodes')
        .select('*')
        .eq('source_id', centerId)
        .maybeSingle();

      if (nodeError) {
        return NextResponse.json({ error: nodeError.message }, { status: 500 });
      }

      if (!centerNode) {
        return NextResponse.json({ nodes: [], edges: [] });
      }

      // Fetch all edges connected to this node
      const { data: edges, error: edgesError } = await supabase
        .from('kg_edges')
        .select('*')
        .or(`source_node.eq.${centerNode.id},target_node.eq.${centerNode.id}`);

      if (edgesError) {
        return NextResponse.json({ error: edgesError.message }, { status: 500 });
      }

      // Collect all neighbor node IDs
      const neighborIds = new Set<string>();
      neighborIds.add(centerNode.id);
      edges.forEach((edge: any) => {
        neighborIds.add(edge.source_node);
        neighborIds.add(edge.target_node);
      });

      // Fetch all these neighbor nodes
      const { data: nodes, error: neighborsError } = await supabase
        .from('kg_nodes')
        .select('*')
        .in('id', Array.from(neighborIds));

      if (neighborsError) {
        return NextResponse.json({ error: neighborsError.message }, { status: 500 });
      }

      return NextResponse.json({ nodes, edges });
    }

    // Default: Get top N nodes and edges
    const { data: nodes, error: nodesError } = await supabase
      .from('kg_nodes')
      .select('*')
      .limit(limit);

    if (nodesError) {
      return NextResponse.json({ error: nodesError.message }, { status: 500 });
    }

    const nodeIds = nodes.map((n: any) => n.id);
    const { data: edges, error: edgesError } = await supabase
      .from('kg_edges')
      .select('*')
      .in('source_node', nodeIds)
      .in('target_node', nodeIds);

    if (edgesError) {
      return NextResponse.json({ error: edgesError.message }, { status: 500 });
    }

    return NextResponse.json({ nodes, edges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
