-- Add language column to issues table
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS language language_code NOT NULL DEFAULT 'ar';

-- Add an index on the new column since we will filter by it often
CREATE INDEX IF NOT EXISTS idx_issues_language ON public.issues(language);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
