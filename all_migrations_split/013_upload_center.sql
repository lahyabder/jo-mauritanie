-- ============================================================
-- Migration 013: Upload Center — Jobs & Extracted Documents
-- ============================================================

-- ------------------------------------
-- UPLOAD JOBS: tracks each gazette PDF upload + processing run
-- ------------------------------------
CREATE TYPE job_status AS ENUM (
  'pending',          -- Just uploaded, not yet processed
  'extracting_text',  -- PDF text extraction in progress
  'running_ocr',      -- OCR pass in progress
  'detecting_structure', -- Splitting into individual documents
  'classifying',      -- AI classification in progress
  'review',           -- Human review stage (processing done)
  'publishing',       -- Publishing approved docs to documents table
  'completed',        -- All done
  'failed'            -- Unrecoverable error
);

CREATE TABLE upload_jobs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Linked gazette issue (may be created during processing)
  issue_id              UUID REFERENCES issues(id) ON DELETE SET NULL,

  -- File info
  original_filename     TEXT NOT NULL,
  pdf_storage_path      TEXT NOT NULL,                -- Supabase Storage path
  pdf_public_url        TEXT,
  pdf_file_size_bytes   BIGINT,
  pdf_page_count        INTEGER,
  pdf_checksum          TEXT,                         -- SHA-256

  -- Processing state
  status                job_status NOT NULL DEFAULT 'pending',
  progress_percent      SMALLINT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  current_step_label    TEXT,                         -- Human-readable current step

  -- Results summary
  total_pages_processed INTEGER DEFAULT 0,
  documents_extracted   INTEGER DEFAULT 0,
  documents_approved    INTEGER DEFAULT 0,
  documents_published   INTEGER DEFAULT 0,
  documents_rejected    INTEGER DEFAULT 0,

  -- OCR info
  required_ocr          BOOLEAN DEFAULT FALSE,
  ocr_language          TEXT DEFAULT 'ara+fra',       -- Tesseract language codes
  avg_text_confidence   NUMERIC(5,2),                 -- 0–100

  -- Gazette metadata (detected or manually set)
  detected_issue_number INTEGER,
  detected_pub_date     DATE,
  issue_confirmed       BOOLEAN DEFAULT FALSE,

  -- Errors
  error_message         TEXT,
  error_details         JSONB,
  retry_count           SMALLINT DEFAULT 0,

  -- Timing
  upload_completed_at   TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  processing_ended_at   TIMESTAMPTZ,
  processing_duration_ms INTEGER,

  -- Who uploaded
  uploaded_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_jobs_status       ON upload_jobs(status);
CREATE INDEX idx_upload_jobs_issue_id     ON upload_jobs(issue_id);
CREATE INDEX idx_upload_jobs_uploaded_by  ON upload_jobs(uploaded_by);
CREATE INDEX idx_upload_jobs_created_at   ON upload_jobs(created_at DESC);

CREATE TRIGGER set_updated_at_upload_jobs
  BEFORE UPDATE ON upload_jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------
-- UPLOAD JOB LOGS: step-by-step processing log
-- ------------------------------------
CREATE TABLE upload_job_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,
  level       VARCHAR(10) NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message     TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_logs_job_id    ON upload_job_logs(job_id);
CREATE INDEX idx_job_logs_level     ON upload_job_logs(level);
CREATE INDEX idx_job_logs_created   ON upload_job_logs(created_at DESC);


-- ------------------------------------
-- EXTRACTED DOCUMENTS: staging table before publishing
-- One row per detected document in a gazette issue
-- ------------------------------------
CREATE TYPE extraction_review_status AS ENUM (
  'pending_review',   -- Waiting for human review
  'approved',         -- Approved, ready to publish
  'rejected',         -- Rejected, will not be published
  'published',        -- Already published to documents table
  'needs_correction'  -- Has corrections needed flagged by reviewer
);

CREATE TABLE extracted_documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent job
  job_id                UUID NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,

  -- If published, links to the created document
  document_id           UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Position in gazette
  sequence_in_issue     INTEGER NOT NULL,              -- Order within the gazette (1, 2, 3...)
  pdf_page_start        INTEGER,
  pdf_page_end          INTEGER,

  -- ── EXTRACTED FIELDS (auto-detected, editable before publish) ──

  -- Classification
  detected_type         document_type,
  confirmed_type        document_type,                 -- Set by reviewer; if NULL use detected_type
  classification_confidence NUMERIC(5,2),              -- 0–100, how sure was the classifier
  classification_model  TEXT,                          -- e.g. 'gemini-1.5-flash', 'regex-v1'
  classification_reasons JSONB,                        -- Array of signals that drove the classification

  -- Official number (extracted from text)
  detected_official_number  TEXT,
  confirmed_official_number TEXT,

  -- Dates
  detected_date         DATE,
  confirmed_date        DATE,

  -- Institution (detected)
  detected_institution_name_ar  TEXT,
  detected_institution_name_fr  TEXT,
  confirmed_institution_id      UUID REFERENCES institutions(id) ON DELETE SET NULL,

  -- Multilingual titles (extracted)
  detected_title_ar     TEXT,
  detected_title_fr     TEXT,
  confirmed_title_ar    TEXT,
  confirmed_title_fr    TEXT,

  -- Full extracted text
  raw_text_ar           TEXT,                          -- Arabic raw extraction
  raw_text_fr           TEXT,                          -- French raw extraction
  raw_text_mixed        TEXT,                          -- Mixed/unknown

  -- Cleaned text (after post-processing)
  cleaned_text_ar       TEXT,
  cleaned_text_fr       TEXT,

  -- OCR-specific
  ocr_used              BOOLEAN DEFAULT FALSE,
  ocr_confidence        NUMERIC(5,2),                  -- Average word confidence (0–100)
  ocr_word_count        INTEGER,
  low_confidence_regions JSONB,                        -- [{page, bbox, confidence}]

  -- Structure analysis
  has_articles          BOOLEAN DEFAULT FALSE,
  articles_count        INTEGER,
  has_preamble          BOOLEAN DEFAULT FALSE,
  has_signatures        BOOLEAN DEFAULT FALSE,
  detected_signatories  TEXT[],                        -- Names found in signature block
  detected_keywords     TEXT[],

  -- AI-generated summary
  ai_summary_ar         TEXT,
  ai_summary_fr         TEXT,
  ai_keywords           TEXT[],

  -- Review
  review_status         extraction_review_status NOT NULL DEFAULT 'pending_review',
  reviewer_notes        TEXT,
  corrections           JSONB,                         -- {field: {old, new}} diff of reviewer edits
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at          TIMESTAMPTZ,

  -- Overall quality score
  extraction_quality_score NUMERIC(5,2),               -- Computed: 0–100
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_extracted_job_id         ON extracted_documents(job_id);
CREATE INDEX idx_extracted_document_id    ON extracted_documents(document_id);
CREATE INDEX idx_extracted_type           ON extracted_documents(detected_type);
CREATE INDEX idx_extracted_review_status  ON extracted_documents(review_status);
CREATE INDEX idx_extracted_sequence       ON extracted_documents(job_id, sequence_in_issue);
CREATE INDEX idx_extracted_confidence     ON extracted_documents(classification_confidence DESC);
CREATE INDEX idx_extracted_institution    ON extracted_documents(confirmed_institution_id);

CREATE TRIGGER set_updated_at_extracted_documents
  BEFORE UPDATE ON extracted_documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------
-- RLS for new tables
-- ------------------------------------
ALTER TABLE upload_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_job_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_documents   ENABLE ROW LEVEL SECURITY;

-- Upload jobs: editors see all, readers see nothing
CREATE POLICY "upload_jobs_editor_all"
  ON upload_jobs FOR ALL USING (is_editor_or_above());

CREATE POLICY "upload_job_logs_editor_all"
  ON upload_job_logs FOR ALL USING (is_editor_or_above());

CREATE POLICY "extracted_documents_editor_all"
  ON extracted_documents FOR ALL USING (is_editor_or_above());

-- ------------------------------------
-- FUNCTION: compute extraction quality score
-- ------------------------------------
CREATE OR REPLACE FUNCTION compute_extraction_quality(p_id UUID)
RETURNS NUMERIC(5,2) LANGUAGE plpgsql AS $$
DECLARE
  v_doc extracted_documents%ROWTYPE;
  v_score NUMERIC := 0;
BEGIN
  SELECT * INTO v_doc FROM extracted_documents WHERE id = p_id;

  -- Classification confidence (0-40 pts)
  v_score := v_score + LEAST(COALESCE(v_doc.classification_confidence, 0) * 0.4, 40);

  -- OCR confidence (0-30 pts) or text extraction quality
  IF v_doc.ocr_used THEN
    v_score := v_score + LEAST(COALESCE(v_doc.ocr_confidence, 0) * 0.3, 30);
  ELSE
    -- Non-OCR text assumed high quality
    IF v_doc.raw_text_ar IS NOT NULL OR v_doc.raw_text_fr IS NOT NULL THEN
      v_score := v_score + 30;
    END IF;
  END IF;

  -- Has title (10 pts)
  IF v_doc.detected_title_ar IS NOT NULL OR v_doc.detected_title_fr IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- Has official number (10 pts)
  IF v_doc.detected_official_number IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- Has date (10 pts)
  IF v_doc.detected_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- Update the score
  UPDATE extracted_documents
    SET extraction_quality_score = v_score
    WHERE id = p_id;

  RETURN v_score;
END;
$$;

COMMENT ON TABLE upload_jobs IS 'Tracks each gazette PDF upload through the full extraction pipeline.';
COMMENT ON TABLE extracted_documents IS 'Staging table for extracted documents before human review and publish. Never read by the public — only editors see this.';


