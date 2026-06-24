-- ============================================================
-- Migration 019: Create Supabase Storage bucket for gazette PDFs
-- ============================================================

-- Create the storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gazette-pdfs',
  'gazette-pdfs',
  true,                              -- public bucket (PDFs are public documents)
  52428800,                          -- 50 MB max per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow anyone to read (download) PDFs
CREATE POLICY "Public read gazette-pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gazette-pdfs');

-- RLS: allow service_role (admin API) to insert
CREATE POLICY "Service role insert gazette-pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gazette-pdfs');

-- RLS: allow service_role (admin API) to update
CREATE POLICY "Service role update gazette-pdfs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gazette-pdfs');

-- RLS: allow service_role to delete
CREATE POLICY "Service role delete gazette-pdfs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gazette-pdfs');
