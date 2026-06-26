-- ============================================================
-- Fix existing data visibility: update old records to pass RLS
-- ============================================================

-- 1. Fix issues: set is_published = true where status = 'published'
UPDATE public.issues
SET is_published = TRUE
WHERE (is_published = FALSE OR is_published IS NULL)
  AND (status = 'published' OR status IS NULL);

-- 2. Fix documents: set status='published', is_current_version=true, is_confidential=false
UPDATE public.documents
SET
  status             = 'published',
  is_current_version = TRUE,
  is_confidential    = FALSE
WHERE status IN ('active', 'pending', 'draft')
   OR is_current_version IS DISTINCT FROM TRUE;

-- 3. Verify
SELECT 'issues visible' AS label, COUNT(*) FROM public.issues WHERE is_published = TRUE
UNION ALL
SELECT 'documents visible', COUNT(*) FROM public.documents
WHERE status = 'published' AND is_current_version = TRUE AND is_confidential = FALSE;
