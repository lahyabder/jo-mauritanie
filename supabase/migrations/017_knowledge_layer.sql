-- Migration: 017_knowledge_layer.sql
-- Description: Adds tables and security policies for the Knowledge Layer (Stage 16)

-- ----------------------------------------------------------------
-- TABLE: legal_events
-- Structured events derived from documents/appointments/relations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_events (
    id                  uuid default gen_random_uuid() primary key,
    event_type          text not null,
    category            text not null,
    title_ar            text not null,
    title_fr            text,
    description_ar      text,
    description_fr      text,
    event_date          date,
    event_date_end      date,
    document_id         uuid references public.documents(id) on delete cascade,
    article_id          uuid references public.articles(id) on delete set null,
    person_id           uuid references public.persons(id) on delete set null,
    institution_id      uuid references public.institutions(id) on delete set null,
    issue_id            uuid references public.issues(id) on delete set null,
    ai_generated        boolean default true,
    confidence          real default 1.0,
    knowledge_version   text,
    created_at          timestamp with time zone default now() not null
);

CREATE INDEX IF NOT EXISTS idx_events_type on public.legal_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_category on public.legal_events(category);
CREATE INDEX IF NOT EXISTS idx_events_date on public.legal_events(event_date desc);
CREATE INDEX IF NOT EXISTS idx_events_document_id on public.legal_events(document_id);
CREATE INDEX IF NOT EXISTS idx_events_person_id on public.legal_events(person_id);
CREATE INDEX IF NOT EXISTS idx_events_institution_id on public.legal_events(institution_id);

-- ----------------------------------------------------------------
-- TABLE: knowledge_cards
-- AI-generated insight cards attached to any entity
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_cards (
    id                  uuid default gen_random_uuid() primary key,
    entity_type         text not null,
    entity_id           uuid not null,
    card_type           text not null,
    title_ar            text not null,
    title_fr            text,
    content_ar          text not null,
    content_fr          text,
    stats_json          jsonb,
    ai_model_version    text,
    knowledge_version   text,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null,
    unique(entity_type, entity_id, card_type)
);

CREATE INDEX IF NOT EXISTS idx_cards_entity on public.knowledge_cards(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cards_type on public.knowledge_cards(card_type);

-- ----------------------------------------------------------------
-- TABLE: document_collections
-- Auto-curated thematic document collections
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_collections (
    id              uuid default gen_random_uuid() primary key,
    code            text unique,
    title_ar        text not null,
    title_fr        text,
    description_ar  text,
    description_fr  text,
    collection_type text not null,
    filter_json     jsonb,
    document_count  integer default 0,
    color           text,
    icon            text,
    is_auto         boolean default true,
    is_featured     boolean default false,
    knowledge_version text,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

CREATE TABLE IF NOT EXISTS public.collection_documents (
    collection_id   uuid references public.document_collections(id) on delete cascade,
    document_id     uuid references public.documents(id) on delete cascade,
    order_index     integer default 0,
    relevance_score real default 1.0,
    primary key (collection_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_docs_collection on public.collection_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_docs_document on public.collection_documents(document_id);

-- ----------------------------------------------------------------
-- TABLE: semantic_links
-- Hidden relationships detected via embedding similarity
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semantic_links (
    id              uuid default gen_random_uuid() primary key,
    source_type     text not null,
    source_id       uuid not null,
    target_type     text not null,
    target_id       uuid not null,
    similarity_score real not null,
    link_type       text default 'semantic',
    explanation_ar  text,
    knowledge_version text,
    created_at      timestamp with time zone default now() not null,
    unique(source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_sem_links_source on public.semantic_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_sem_links_score on public.semantic_links(similarity_score desc);

-- ----------------------------------------------------------------
-- TABLE: ai_narratives
-- Human-readable historical narrative summaries
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_narratives (
    id              uuid default gen_random_uuid() primary key,
    entity_type     text not null,
    entity_id       uuid not null,
    narrative_type  text not null,
    narrative_ar    text not null,
    narrative_fr    text,
    period_start    date,
    period_end      date,
    ai_model_version text,
    knowledge_version text,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null,
    unique(entity_type, entity_id, narrative_type)
);

CREATE INDEX IF NOT EXISTS idx_narratives_entity on public.ai_narratives(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_narratives_type on public.ai_narratives(narrative_type);

-- ----------------------------------------------------------------
-- TABLE: knowledge_scores
-- Importance score for every document (for search ranking)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_scores (
    document_id             uuid references public.documents(id) on delete cascade primary key,
    citation_score          real default 0,
    amendment_score         real default 0,
    reference_score         real default 0,
    entity_score            real default 0,
    total_score             real default 0,
    percentile_rank         real,
    knowledge_version       text,
    last_computed_at        timestamp with time zone default now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_scores_total on public.knowledge_scores(total_score desc);
CREATE INDEX IF NOT EXISTS idx_knowledge_scores_percentile on public.knowledge_scores(percentile_rank desc);

-- ----------------------------------------------------------------
-- RLS for all knowledge tables
-- ----------------------------------------------------------------
ALTER TABLE public.legal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_scores ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    t text; 
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'legal_events','knowledge_cards','document_collections',
        'collection_documents','semantic_links','ai_narratives','knowledge_scores'
    ] LOOP
        EXECUTE format(
            'CREATE POLICY "Allow public read access on %I" ON public.%I FOR SELECT USING (true);', t, t
        );
    END LOOP;
END $$;
