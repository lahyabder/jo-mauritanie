-- ============================================================
-- Migration 007: Relations & Versioning
-- ============================================================

-- ------------------------------------
-- DOCUMENT RELATIONS (LawRelations + DocumentRelations unified)
-- Directed graph: source_id → target_id with a typed relation
-- ------------------------------------
CREATE TABLE document_relations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Directed edge
  source_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relation_type   relation_type NOT NULL,
  
  -- Description of the relation
  description_ar  TEXT,
  description_fr  TEXT,
  
  -- Which article(s) of source creates this relation
  source_articles TEXT[],                                         -- e.g. {"Article 3", "Article 7"}
  target_articles TEXT[],
  
  -- Confidence (for AI-inferred relations)
  is_ai_inferred  BOOLEAN NOT NULL DEFAULT FALSE,
  confidence      NUMERIC(4, 3) CHECK (confidence BETWEEN 0 AND 1),
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Prevent duplicate identical relations
  CONSTRAINT document_relations_unique UNIQUE (source_id, target_id, relation_type),
  -- Prevent self-relations
  CONSTRAINT document_relations_no_self CHECK (source_id <> target_id)
);

CREATE INDEX idx_doc_relations_source       ON document_relations(source_id);
CREATE INDEX idx_doc_relations_target       ON document_relations(target_id);
CREATE INDEX idx_doc_relations_type         ON document_relations(relation_type);
CREATE INDEX idx_doc_relations_ai_inferred  ON document_relations(is_ai_inferred);

-- Convenience view: all amendments to a law
CREATE VIEW law_amendments AS
  SELECT
    dr.target_id  AS law_id,
    dr.source_id  AS amending_document_id,
    d.official_number,
    d.document_date,
    d.type
  FROM document_relations dr
  JOIN documents d ON d.id = dr.source_id
  WHERE dr.relation_type = 'amends';

-- ------------------------------------
-- LAW RELATIONS (specialized for law↔law hierarchy)
-- Cross-reference between laws: parent laws, implementing decrees, etc.
-- ------------------------------------
CREATE TABLE law_relations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  law_id          UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  related_law_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relation_type   relation_type NOT NULL,
  
  -- Which articles are relevant
  law_articles    TEXT[],
  related_articles TEXT[],
  
  notes_ar        TEXT,
  notes_fr        TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT law_relations_unique UNIQUE (law_id, related_law_id, relation_type),
  CONSTRAINT law_relations_no_self CHECK (law_id <> related_law_id)
);

CREATE INDEX idx_law_relations_law_id         ON law_relations(law_id);
CREATE INDEX idx_law_relations_related_law_id ON law_relations(related_law_id);
CREATE INDEX idx_law_relations_type           ON law_relations(relation_type);


-- ------------------------------------
-- DOCUMENT VERSIONS (full history)
-- Snapshot of key fields at each version change
-- ------------------------------------
CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  
  -- What changed in this version
  change_type     VARCHAR(50) NOT NULL,                           -- 'amendment', 'correction', 'translation_update', 'status_change'
  change_summary_ar TEXT,
  change_summary_fr TEXT,
  
  -- Snapshot of content at this version (JSON for compactness)
  snapshot        JSONB NOT NULL,                                 -- {title_ar, title_fr, content_ar, content_fr, status, official_number, ...}
  
  -- The document that triggered this version (if amendment)
  triggered_by_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Diff (for text changes)
  diff_ar         TEXT,                                           -- Unified diff of content_ar
  diff_fr         TEXT,
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT doc_versions_version_positive CHECK (version >= 1),
  CONSTRAINT doc_versions_unique_version UNIQUE (document_id, version)
);

CREATE INDEX idx_doc_versions_document_id     ON document_versions(document_id);
CREATE INDEX idx_doc_versions_version         ON document_versions(document_id, version DESC);
CREATE INDEX idx_doc_versions_triggered_by    ON document_versions(triggered_by_document_id);

COMMENT ON TABLE document_versions IS 'Full audit trail of document content changes. The snapshot JSONB column stores the complete state at each version point.';


-- ------------------------------------
-- DOCUMENT ↔ PERSONS (many-to-many)
-- ------------------------------------
CREATE TABLE document_persons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  person_id       UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  
  -- Role this person plays in the document
  role_ar         TEXT,                                           -- e.g. "موقّع", "مستفيد"
  role_fr         TEXT,                                           -- e.g. "Signataire", "Bénéficiaire"
  role_type       VARCHAR(50),                                    -- 'signatory', 'beneficiary', 'mentioned', 'appointed'
  
  -- Page where they are mentioned
  mentioned_on_page INTEGER,
  
  -- Confidence (for AI-extracted persons)
  is_ai_extracted   BOOLEAN DEFAULT FALSE,
  confidence        NUMERIC(4, 3),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT doc_persons_unique UNIQUE (document_id, person_id, role_type)
);

CREATE INDEX idx_doc_persons_document  ON document_persons(document_id);
CREATE INDEX idx_doc_persons_person    ON document_persons(person_id);
CREATE INDEX idx_doc_persons_role_type ON document_persons(role_type);


-- ------------------------------------
-- DOCUMENT ↔ INSTITUTIONS (many-to-many)
-- ------------------------------------
CREATE TABLE document_institutions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  
  role_ar         TEXT,
  role_fr         TEXT,
  role_type       VARCHAR(50),                                    -- 'issuer', 'addressee', 'mentioned', 'regulating'
  
  is_ai_extracted BOOLEAN DEFAULT FALSE,
  confidence      NUMERIC(4, 3),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT doc_institutions_unique UNIQUE (document_id, institution_id, role_type)
);

CREATE INDEX idx_doc_institutions_document    ON document_institutions(document_id);
CREATE INDEX idx_doc_institutions_institution ON document_institutions(institution_id);
CREATE INDEX idx_doc_institutions_role_type   ON document_institutions(role_type);

-- ------------------------------------
-- TABLE: legal_relations
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_relations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type         TEXT NOT NULL,
    source_id           UUID NOT NULL,
    target_type         TEXT NOT NULL,
    target_id           UUID NOT NULL,
    relation_type       TEXT NOT NULL,
    confidence          REAL DEFAULT 1.0,
    detected_sentence   TEXT,
    ai_explanation      TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_relations_source ON public.legal_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_legal_relations_target ON public.legal_relations(target_id);

-- ------------------------------------
-- TABLE: legal_citations
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_citations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id  UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    source_article_id   UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    target_document_id  UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    target_article_id   UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    citation_type       TEXT,
    citation_sentence   TEXT,
    ai_explanation      TEXT,
    confidence          REAL DEFAULT 1.0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_citations_source_doc ON public.legal_citations(source_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_citations_target_doc ON public.legal_citations(target_document_id);

