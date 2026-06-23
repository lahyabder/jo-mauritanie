-- Migration: 016_knowledge_graph.sql
-- Description: Creates the core Knowledge Graph abstraction tables (Nodes and Edges)

CREATE TABLE IF NOT EXISTS public.kg_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL, -- The original relational ID (e.g., from documents or persons)
    node_type TEXT NOT NULL, -- e.g., 'Document', 'Person', 'Institution', 'Topic'
    label TEXT NOT NULL, -- The primary display name (e.g., "Law 2021-04", "Mohamed Ould...")
    properties JSONB DEFAULT '{}'::jsonb, -- Any additional metadata (date, status, ministry)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, node_type)
);

CREATE TABLE IF NOT EXISTS public.kg_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node UUID NOT NULL REFERENCES public.kg_nodes(id) ON DELETE CASCADE,
    target_node UUID NOT NULL REFERENCES public.kg_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- e.g., 'AMENDS', 'REPEALS', 'APPOINTED_TO', 'SUPERVISES'
    properties JSONB DEFAULT '{}'::jsonb, -- e.g., { "date": "2023-01-01", "decree_number": "2023-14" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_node, target_node, relationship_type)
);

-- Indexes for fast graph traversal
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON public.kg_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON public.kg_edges(source_node);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON public.kg_edges(target_node);
CREATE INDEX IF NOT EXISTS idx_kg_edges_rel ON public.kg_edges(relationship_type);

-- RLS
ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on kg_nodes" ON public.kg_nodes FOR SELECT USING (true);
CREATE POLICY "Allow public read access on kg_edges" ON public.kg_edges FOR SELECT USING (true);
