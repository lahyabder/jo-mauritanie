-- ============================================================
-- Migration 004: Documents (Universal Base Table)
-- All document types share this table via type discriminator.
-- Type-specific tables extend it with additional columns.
-- ============================================================

CREATE TABLE documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id             UUID REFERENCES public.legal_sources(id) ON DELETE SET NULL,
  
  -- -------------------------------------------------------
  -- Required fields (every document must have these)
  -- -------------------------------------------------------
  
  -- Official identification
  official_number       TEXT,                                     -- e.g. "Loi N° 2024-001"
  issue_id              UUID NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
  type                  document_type NOT NULL,
  
  -- Classification
  category_ar           TEXT,                                     -- Thematic category (Arabic)
  category_fr           TEXT,                                     -- Thematic category (French)
  category_en           TEXT,
  
  -- Issuing institution
  institution_id        UUID REFERENCES institutions(id) ON DELETE SET NULL,
  
  -- Dates
  document_date         DATE NOT NULL,                            -- Date on the document itself
  effective_date        DATE,                                     -- Date it enters into force
  expiry_date           DATE,                                     -- Date it expires (if applicable)
  signature_date        DATE,
  
  -- Language of original
  original_language     language_code NOT NULL DEFAULT 'ar',
  
  -- Multilingual titles
  title_ar              TEXT,
  title_fr              TEXT,
  title_en              TEXT,
  
  -- Multilingual original text (full)
  content_ar            TEXT,
  content_fr            TEXT,
  content_en            TEXT,
  
  -- Summaries
  summary_ar            TEXT,                                     -- Human-written summary (Arabic)
  summary_fr            TEXT,                                     -- Human-written summary (French)
  summary_en            TEXT,
  
  -- AI-generated content
  ai_summary_ar         TEXT,
  ai_summary_fr         TEXT,
  ai_summary_en         TEXT,
  ai_keywords           TEXT[],                                   -- AI-extracted keyword array
  ai_entities           JSONB,                                    -- AI-extracted named entities
  ai_processed_at       TIMESTAMPTZ,
  
  -- Manual keywords / tags
  keywords              TEXT[],
  tags                  TEXT[],
  
  -- PDF location within gazette issue
  pdf_page_start        INTEGER,                                  -- First page in the issue PDF
  pdf_page_end          INTEGER,                                  -- Last page in the issue PDF
  pdf_url               TEXT,                                     -- Direct link to document PDF (extracted)
  pdf_storage_path      TEXT,                                     -- Supabase Storage path
  
  -- Permanent canonical URL (immutable after publish)
  permanent_url         TEXT UNIQUE,                              -- e.g. /documents/laws/2024-001
  
  -- Status & versioning
  status                document_status NOT NULL DEFAULT 'draft',
  version               INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_current_version    BOOLEAN NOT NULL DEFAULT TRUE,
  parent_id             UUID REFERENCES documents(id) ON DELETE SET NULL, -- For versioning chain
  
  -- Metadata
  page_count            INTEGER,
  word_count_ar         INTEGER,
  word_count_fr         INTEGER,
  is_confidential       BOOLEAN NOT NULL DEFAULT FALSE,
  requires_gazette_ref  BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Source metadata
  source_url            TEXT,
  scraped_at            TIMESTAMPTZ,
  raw_metadata          JSONB,                                    -- Any extra structured metadata from parsing
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Full-text search vector (combined multilingual, weighted)
  search_vector         TSVECTOR,
  
  -- Constraints
  CONSTRAINT documents_pdf_pages_order CHECK (
    pdf_page_start IS NULL OR pdf_page_end IS NULL OR pdf_page_end >= pdf_page_start
  ),
  CONSTRAINT documents_effective_after_document CHECK (
    effective_date IS NULL OR effective_date >= document_date - INTERVAL '1 year'
  )
);

-- ------------------------------------
-- Indexes — Critical for millions of records
-- ------------------------------------

-- Primary lookup patterns
CREATE INDEX idx_documents_issue_id         ON documents(issue_id);
CREATE INDEX idx_documents_type             ON documents(type);
CREATE INDEX idx_documents_status           ON documents(status);
CREATE INDEX idx_documents_institution_id   ON documents(institution_id);
CREATE INDEX idx_documents_document_date    ON documents(document_date DESC);
CREATE INDEX idx_documents_effective_date   ON documents(effective_date DESC);
CREATE INDEX idx_documents_is_current       ON documents(is_current_version);
CREATE INDEX idx_documents_parent_id        ON documents(parent_id);

-- Compound indexes for common queries
CREATE INDEX idx_documents_type_status      ON documents(type, status);
CREATE INDEX idx_documents_type_date        ON documents(type, document_date DESC);
CREATE INDEX idx_documents_issue_type       ON documents(issue_id, type);
CREATE INDEX idx_documents_status_current   ON documents(status, is_current_version);

-- Full-text search (GIN — essential for millions of records)
CREATE INDEX idx_documents_search_vector    ON documents USING GIN(search_vector);

-- Trigram search (for partial match / autocomplete)
CREATE INDEX idx_documents_title_ar_trgm    ON documents USING GIN(title_ar gin_trgm_ops);
CREATE INDEX idx_documents_title_fr_trgm    ON documents USING GIN(title_fr gin_trgm_ops);
CREATE INDEX idx_documents_official_number  ON documents USING GIN(official_number gin_trgm_ops);

-- Array / JSONB indexes
CREATE INDEX idx_documents_keywords         ON documents USING GIN(keywords);
CREATE INDEX idx_documents_ai_keywords      ON documents USING GIN(ai_keywords);
CREATE INDEX idx_documents_ai_entities      ON documents USING GIN(ai_entities);
CREATE INDEX idx_documents_tags             ON documents USING GIN(tags);

-- Partial index: only current, published documents (most common read path)
CREATE INDEX idx_documents_published_current ON documents(document_date DESC)
  WHERE status = 'published' AND is_current_version = TRUE;

-- Year-based partitioning helper index
CREATE INDEX idx_documents_year             ON documents(date_part('year', document_date));

-- Trigger
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-set published_at when status becomes 'published'
CREATE OR REPLACE FUNCTION trigger_set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status <> 'published' THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_published_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_published_at();

-- Comments
COMMENT ON TABLE  documents IS 'Universal document table. All gazette document types (laws, decrees, decisions, etc.) share this table. Type-specific metadata lives in dedicated extension tables.';
COMMENT ON COLUMN documents.official_number IS 'The official number as it appears in the gazette, e.g. "Loi N° 2024-001 du 15 janvier 2024".';
COMMENT ON COLUMN documents.version IS 'Starts at 1. Incremented when an amendment creates a new version.';
COMMENT ON COLUMN documents.is_current_version IS 'True only for the latest version of a document. Old versions have this set to FALSE.';
COMMENT ON COLUMN documents.parent_id IS 'Points to previous version of the same document, forming a version chain.';
COMMENT ON COLUMN documents.permanent_url IS 'Canonical immutable URL. Set on first publish and never changed.';
COMMENT ON COLUMN documents.pdf_page_start IS 'Page number within the full gazette issue PDF where this document begins (1-indexed).';
COMMENT ON COLUMN documents.search_vector IS 'Auto-maintained GIN-indexed tsvector for multilingual full-text search across Arabic and French.';

-- ------------------------------------
-- TABLE: articles
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id         UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  article_number      TEXT NOT NULL,
  article_title       TEXT,
  order_index         INTEGER DEFAULT 0,
  page_number         INTEGER,
  original_text       TEXT,
  ai_summary          TEXT,
  keywords            TEXT[],
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_document ON public.articles(document_id);
CREATE INDEX IF NOT EXISTS idx_articles_number   ON public.articles(article_number);



