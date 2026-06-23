-- ============================================================
-- Migration 014: NER Fuzzy Matching RPCs
-- ============================================================

-- Function to fuzzy match persons using pg_trgm similarity
CREATE OR REPLACE FUNCTION match_person_fuzzy(
  p_name TEXT,
  p_threshold FLOAT DEFAULT 0.85
)
RETURNS TABLE (
  id UUID,
  full_name_ar TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    id, 
    full_name_ar,
    similarity(full_name_ar, p_name) AS similarity
  FROM persons
  WHERE full_name_ar % p_name -- uses gin_trgm_ops index for speed
    AND similarity(full_name_ar, p_name) > p_threshold
  ORDER BY similarity DESC
  LIMIT 5;
$$;

-- Function to fuzzy match institutions
CREATE OR REPLACE FUNCTION match_institution_fuzzy(
  p_name TEXT,
  p_threshold FLOAT DEFAULT 0.85
)
RETURNS TABLE (
  id UUID,
  name_ar TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    id, 
    name_ar,
    similarity(name_ar, p_name) AS similarity
  FROM institutions
  WHERE name_ar % p_name
    AND similarity(name_ar, p_name) > p_threshold
  ORDER BY similarity DESC
  LIMIT 5;
$$;
