-- ============================================================
-- Migration 015: Sync Logs & Ingestion History
-- ============================================================

DROP TABLE IF EXISTS public.sync_logs CASCADE;

CREATE TABLE public.sync_logs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id               UUID REFERENCES public.legal_sources(id) ON DELETE SET NULL,
  file_name               TEXT,
  pdf_url                 TEXT,
  status                  VARCHAR(20) DEFAULT 'processing',
  issue_id                UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  documents_extracted     INTEGER DEFAULT 0,
  articles_extracted      INTEGER DEFAULT 0,
  persons_extracted       INTEGER DEFAULT 0,
  institutions_extracted  INTEGER DEFAULT 0,
  appointments_extracted  INTEGER DEFAULT 0,
  relations_extracted     INTEGER DEFAULT 0,
  citations_extracted     INTEGER DEFAULT 0,
  ai_model_used           TEXT,
  extraction_version      TEXT,
  error_message           TEXT,
  error_details           JSONB,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ
);

CREATE INDEX idx_sync_logs_started ON public.sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_status  ON public.sync_logs(status);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_admin_all" 
  ON public.sync_logs FOR ALL USING (is_admin());

