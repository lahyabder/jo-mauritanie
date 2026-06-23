-- ============================================================
-- Migration 015: Sync Logs & Webhook Support
-- ============================================================

CREATE TYPE sync_status AS ENUM (
  'running',
  'completed_success',
  'completed_with_errors',
  'failed'
);

CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Execution metadata
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER * 1000
      ELSE NULL
    END
  ) STORED,
  
  -- Trigger type
  trigger_type    VARCHAR(20) DEFAULT 'cron',   -- 'cron', 'manual', 'webhook'
  triggered_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Scraping results
  issues_found    INTEGER DEFAULT 0,            -- Total issues listed on the remote page
  new_issues_downloaded INTEGER DEFAULT 0,      -- How many were entirely new and downloaded
  
  -- System Health
  site_reachable  BOOLEAN DEFAULT TRUE,
  layout_changed  BOOLEAN DEFAULT FALSE,        -- True if the HTML structure breaks our parser
  
  -- Status
  status          sync_status NOT NULL DEFAULT 'running',
  error_message   TEXT,
  error_details   JSONB
);

CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_status  ON sync_logs(status);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_admin_all" 
  ON sync_logs FOR ALL USING (is_admin());
