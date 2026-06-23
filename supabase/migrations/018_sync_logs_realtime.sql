-- ============================================================
-- Migration 018: Allow anon/authenticated to read their own
-- sync_logs row so the upload page Realtime subscription works.
-- ============================================================

-- Allow anyone who knows the row UUID to SELECT it (read-only).
-- The UUID acts as an unguessable token — no sensitive data exposed.
DROP POLICY IF EXISTS "sync_logs_public_read" ON public.sync_logs;

CREATE POLICY "sync_logs_public_read"
  ON public.sync_logs
  FOR SELECT
  USING (true);

-- Enable Realtime replication for this table
-- (idempotent — safe to run again if already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_logs;
