-- ============================================================
-- Migration 003: Issues (Official Gazette Numbers)
-- ============================================================

CREATE TABLE issues (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id           UUID REFERENCES public.legal_sources(id) ON DELETE SET NULL,
  
  -- Official identification
  issue_number        INTEGER NOT NULL UNIQUE,                    -- Official JO number (e.g. 1456)
  issue_number_display VARCHAR(20),                              -- Formatted display e.g. "1456 bis"
  
  -- Dates
  publication_date    DATE NOT NULL,
  reception_date      DATE,                                      -- Date received by observatory
  
  -- Multilingual titles / edition
  title_ar            TEXT,
  title_fr            TEXT,
  title_en            TEXT,
  edition_note_ar     TEXT,                                      -- e.g. "Special edition"
  edition_note_fr     TEXT,
  edition_note_en     TEXT,
  
  -- File storage (Supabase Storage bucket paths)
  pdf_url             TEXT,                                      -- Full PDF of the gazette issue
  pdf_storage_path    TEXT,                                      -- Internal storage path
  pdf_page_count      INTEGER,
  pdf_file_size_bytes BIGINT,
  pdf_checksum        TEXT,                                      -- SHA-256 for integrity
  
  -- Permanent URL (canonical)
  permanent_url       TEXT,
  
  -- Status
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  is_special_edition  BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Summary counts (denormalized for performance)
  document_count      INTEGER DEFAULT 0,
  law_count           INTEGER DEFAULT 0,
  decree_count        INTEGER DEFAULT 0,
  
  -- Source metadata
  source_url          TEXT,                                      -- Original government URL
  scraped_at          TIMESTAMPTZ,
  
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT issues_number_positive CHECK (issue_number > 0)
);

-- Indexes
CREATE INDEX idx_issues_publication_date  ON issues(publication_date DESC);
CREATE INDEX idx_issues_published         ON issues(is_published);
CREATE INDEX idx_issues_special           ON issues(is_special_edition);
CREATE INDEX idx_issues_year              ON issues(EXTRACT(YEAR FROM publication_date));

-- Trigger
CREATE TRIGGER set_updated_at_issues
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Comments
COMMENT ON TABLE  issues IS 'Official Gazette (Journal Officiel) issue records — one row per published issue number.';
COMMENT ON COLUMN issues.issue_number IS 'The official sequential number of the gazette issue, unique and always positive.';
COMMENT ON COLUMN issues.permanent_url IS 'Canonical URL for this issue, auto-generated from issue_number.';


