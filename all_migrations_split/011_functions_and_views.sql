-- ============================================================
-- Migration 011: Database Functions & Views
-- ============================================================

-- ------------------------------------
-- FUNCTION: Full-text search across all entity types
-- Searches documents, persons, and institutions in one call.
-- ------------------------------------
CREATE OR REPLACE FUNCTION search_all(
  p_query         TEXT,
  p_language      language_code    DEFAULT 'ar',
  p_entity_types  TEXT[]           DEFAULT ARRAY['document', 'person', 'institution'],
  p_document_type document_type    DEFAULT NULL,
  p_status        document_status  DEFAULT 'published',
  p_date_from     DATE             DEFAULT NULL,
  p_date_to       DATE             DEFAULT NULL,
  p_limit         INTEGER          DEFAULT 20,
  p_offset        INTEGER          DEFAULT 0
)
RETURNS TABLE (
  entity_type       TEXT,
  entity_id         UUID,
  display_title     TEXT,
  display_snippet   TEXT,
  document_type     document_type,
  document_date     DATE,
  issue_number      INTEGER,
  institution_name  TEXT,
  rank              FLOAT4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tsquery     TSQUERY;
  v_config      REGCONFIG;
BEGIN
  -- Select text search config based on language
  v_config := CASE p_language
    WHEN 'ar' THEN 'arabic'::REGCONFIG
    WHEN 'fr' THEN 'french'::REGCONFIG
    ELSE 'simple'::REGCONFIG
  END;

  -- Build tsquery safely
  BEGIN
    v_tsquery := plainto_tsquery(v_config, p_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := plainto_tsquery('simple', p_query);
  END;

  RETURN QUERY
  SELECT
    si.entity_type,
    si.entity_id,
    CASE p_language
      WHEN 'ar' THEN COALESCE(si.display_title_ar, si.display_title_fr)
      WHEN 'fr' THEN COALESCE(si.display_title_fr, si.display_title_ar)
      ELSE COALESCE(si.display_title_ar, si.display_title_fr)
    END AS display_title,
    CASE p_language
      WHEN 'ar' THEN COALESCE(si.display_snippet_ar, si.display_snippet_fr)
      WHEN 'fr' THEN COALESCE(si.display_snippet_fr, si.display_snippet_ar)
      ELSE COALESCE(si.display_snippet_ar, si.display_snippet_fr)
    END AS display_snippet,
    si.document_type,
    si.document_date,
    si.issue_number,
    CASE p_language
      WHEN 'fr' THEN COALESCE(si.institution_name_fr, si.institution_name_ar)
      ELSE COALESCE(si.institution_name_ar, si.institution_name_fr)
    END AS institution_name,
    ts_rank_cd(
      CASE p_language
        WHEN 'ar' THEN si.search_vector_ar
        WHEN 'fr' THEN si.search_vector_fr
        ELSE si.search_vector_ar
      END,
      v_tsquery
    ) * si.relevance_boost + (si.popularity_score / 1000.0)::FLOAT4 AS rank
  FROM search_index si
  WHERE
    -- Entity type filter
    si.entity_type = ANY(p_entity_types)
    -- Full-text match
    AND (
      CASE p_language
        WHEN 'ar' THEN si.search_vector_ar @@ v_tsquery
        WHEN 'fr' THEN si.search_vector_fr @@ v_tsquery
        ELSE si.search_vector_ar @@ v_tsquery OR si.search_vector_fr @@ v_tsquery
      END
    )
    -- Optional filters
    AND (p_document_type IS NULL OR si.document_type = p_document_type)
    AND (p_status IS NULL OR si.status = p_status)
    AND (p_date_from IS NULL OR si.document_date >= p_date_from)
    AND (p_date_to IS NULL OR si.document_date <= p_date_to)
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- ------------------------------------
-- FUNCTION: Refresh search_index for a single entity
-- ------------------------------------
CREATE OR REPLACE FUNCTION refresh_search_index_for_document(p_document_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_doc documents%ROWTYPE;
  v_institution_name_ar TEXT;
  v_institution_name_fr TEXT;
BEGIN
  SELECT * INTO v_doc FROM documents WHERE id = p_document_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT name_ar, name_fr INTO v_institution_name_ar, v_institution_name_fr
  FROM institutions WHERE id = v_doc.institution_id;

  INSERT INTO search_index (
    entity_type, entity_id,
    display_title_ar, display_title_fr,
    display_snippet_ar, display_snippet_fr,
    document_type, document_date, issue_number,
    institution_name_ar, institution_name_fr,
    status,
    search_vector_ar, search_vector_fr,
    entity_updated_at
  )
  SELECT
    'document',
    v_doc.id,
    v_doc.title_ar,
    v_doc.title_fr,
    LEFT(v_doc.summary_ar, 200),
    LEFT(v_doc.summary_fr, 200),
    v_doc.type,
    v_doc.document_date,
    iss.issue_number,
    v_institution_name_ar,
    v_institution_name_fr,
    v_doc.status,
    v_doc.search_vector,
    v_doc.search_vector,
    v_doc.updated_at
  FROM issues iss WHERE iss.id = v_doc.issue_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    display_title_ar      = EXCLUDED.display_title_ar,
    display_title_fr      = EXCLUDED.display_title_fr,
    display_snippet_ar    = EXCLUDED.display_snippet_ar,
    display_snippet_fr    = EXCLUDED.display_snippet_fr,
    document_type         = EXCLUDED.document_type,
    document_date         = EXCLUDED.document_date,
    status                = EXCLUDED.status,
    search_vector_ar      = EXCLUDED.search_vector_ar,
    search_vector_fr      = EXCLUDED.search_vector_fr,
    institution_name_ar   = EXCLUDED.institution_name_ar,
    institution_name_fr   = EXCLUDED.institution_name_fr,
    entity_updated_at     = EXCLUDED.entity_updated_at,
    indexed_at            = NOW();
END;
$$;

-- Trigger: auto-update search_index when a document changes
CREATE OR REPLACE FUNCTION trigger_refresh_search_index()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_search_index_for_document(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_search_on_document_change
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_index();


-- ------------------------------------
-- FUNCTION: Get document lineage (full version chain)
-- ------------------------------------
CREATE OR REPLACE FUNCTION get_document_lineage(p_document_id UUID)
RETURNS TABLE (
  id            UUID,
  version       INTEGER,
  status        document_status,
  official_number TEXT,
  document_date DATE,
  change_type   TEXT,
  change_summary_ar TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE lineage AS (
    -- Start from the given document
    SELECT d.id, d.version, d.status, d.official_number, d.document_date, d.parent_id
    FROM documents d WHERE d.id = p_document_id
    UNION ALL
    -- Walk up the version chain
    SELECT d.id, d.version, d.status, d.official_number, d.document_date, d.parent_id
    FROM documents d
    JOIN lineage l ON d.id = l.parent_id
  )
  SELECT
    l.id, l.version, l.status, l.official_number, l.document_date,
    dv.change_type,
    dv.change_summary_ar
  FROM lineage l
  LEFT JOIN document_versions dv ON dv.document_id = l.id AND dv.version = l.version
  ORDER BY l.version DESC;
$$;


-- ------------------------------------
-- FUNCTION: Get appointment history for a person
-- ------------------------------------
CREATE OR REPLACE FUNCTION get_person_appointment_history(p_person_id UUID)
RETURNS TABLE (
  appointment_id    UUID,
  appointment_type  appointment_type,
  position_title_ar TEXT,
  position_title_fr TEXT,
  institution_name_ar TEXT,
  institution_name_fr TEXT,
  appointment_date  DATE,
  effective_date    DATE,
  end_date          DATE,
  document_id       UUID,
  issue_number      INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    a.id,
    a.appointment_type,
    a.position_title_ar,
    a.position_title_fr,
    i.name_ar,
    i.name_fr,
    a.appointment_date,
    a.effective_date,
    a.end_date,
    a.document_id,
    iss.issue_number
  FROM appointments a
  LEFT JOIN institutions i ON i.id = a.institution_id
  LEFT JOIN documents d ON d.id = a.document_id
  LEFT JOIN issues iss ON iss.id = d.issue_id
  WHERE a.person_id = p_person_id
  ORDER BY a.appointment_date DESC;
$$;


-- ------------------------------------
-- FUNCTION: Compute and store statistics snapshot
-- ------------------------------------
CREATE OR REPLACE FUNCTION compute_statistics_snapshot()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Documents by type (monthly)
  INSERT INTO statistics (stat_key, period, period_start, period_end, dimension_type, dimension_value, count)
  SELECT
    'documents_by_type',
    'monthly',
    date_trunc('month', v_today)::DATE,
    (date_trunc('month', v_today) + INTERVAL '1 month - 1 day')::DATE,
    'document_type',
    type::TEXT,
    COUNT(*)
  FROM documents
  WHERE status = 'published' AND is_current_version = TRUE
  GROUP BY type
  ON CONFLICT (stat_key, period, period_start, dimension_type, dimension_value)
  DO UPDATE SET count = EXCLUDED.count, computed_at = NOW();

  -- Documents by year
  INSERT INTO statistics (stat_key, period, period_start, period_end, dimension_type, dimension_value, count)
  SELECT
    'documents_by_year',
    'yearly',
    DATE(EXTRACT(YEAR FROM document_date)::TEXT || '-01-01'),
    DATE(EXTRACT(YEAR FROM document_date)::TEXT || '-12-31'),
    'year',
    EXTRACT(YEAR FROM document_date)::TEXT,
    COUNT(*)
  FROM documents
  WHERE status = 'published' AND is_current_version = TRUE
  GROUP BY EXTRACT(YEAR FROM document_date)
  ON CONFLICT (stat_key, period, period_start, dimension_type, dimension_value)
  DO UPDATE SET count = EXCLUDED.count, computed_at = NOW();

  -- Total issues
  INSERT INTO statistics (stat_key, period, period_start, period_end, count)
  VALUES (
    'total_issues', 'monthly',
    date_trunc('month', v_today)::DATE,
    (date_trunc('month', v_today) + INTERVAL '1 month - 1 day')::DATE,
    (SELECT COUNT(*) FROM issues WHERE is_published = TRUE)
  )
  ON CONFLICT (stat_key, period, period_start, dimension_type, dimension_value)
  DO UPDATE SET count = EXCLUDED.count, computed_at = NOW();
END;
$$;


-- ------------------------------------
-- VIEWS: Convenience views for API layer
-- ------------------------------------

-- Latest gazette issues (for homepage)
CREATE VIEW v_latest_issues AS
  SELECT
    i.*,
    COUNT(d.id) AS total_documents
  FROM issues i
  LEFT JOIN documents d ON d.issue_id = i.id AND d.status = 'published' AND d.is_current_version = TRUE
  WHERE i.is_published = TRUE
  GROUP BY i.id
  ORDER BY i.publication_date DESC;

-- Published documents with institution name (for list pages)
CREATE VIEW v_documents_with_institution AS
  SELECT
    d.*,
    inst.name_ar AS institution_name_ar,
    inst.name_fr AS institution_name_fr,
    inst.short_name_ar AS institution_short_ar,
    inst.short_name_fr AS institution_short_fr,
    i.issue_number,
    i.publication_date AS issue_date
  FROM documents d
  LEFT JOIN institutions inst ON inst.id = d.institution_id
  LEFT JOIN issues i ON i.id = d.issue_id
  WHERE d.status = 'published' AND d.is_current_version = TRUE;

-- Recent appointments with person and institution (for homepage)
CREATE VIEW v_recent_appointments AS
  SELECT
    a.*,
    p.full_name_ar AS person_full_name_ar,
    p.full_name_fr AS person_full_name_fr,
    p.photo_url,
    inst.name_ar AS institution_name_ar,
    inst.name_fr AS institution_name_fr,
    d.official_number AS document_official_number,
    i.issue_number,
    i.publication_date
  FROM appointments a
  LEFT JOIN persons p ON p.id = a.person_id
  LEFT JOIN institutions inst ON inst.id = a.institution_id
  JOIN documents d ON d.id = a.document_id AND d.status = 'published'
  JOIN issues i ON i.id = d.issue_id
  ORDER BY a.appointment_date DESC;

-- ------------------------------------
-- VIEW: entities
-- ------------------------------------
CREATE OR REPLACE VIEW public.entities AS
  SELECT id, full_name_ar AS name_ar, full_name_fr AS name_fr, 'person' AS entity_type FROM public.persons
  UNION ALL
  SELECT id, name_ar, name_fr, 'institution' AS entity_type FROM public.institutions;

-- ------------------------------------
-- VIEW: document_entities
-- ------------------------------------
CREATE OR REPLACE VIEW public.document_entities AS
  SELECT document_id, person_id AS entity_id, 'person' AS entity_type, role_ar AS role FROM public.document_persons
  UNION ALL
  SELECT document_id, institution_id AS entity_id, 'institution' AS entity_type, role_ar AS role FROM public.document_institutions;

-- ------------------------------------
-- VIEW: timeline_events
-- ------------------------------------
CREATE OR REPLACE VIEW public.timeline_events AS
  SELECT 
    le.id,
    le.event_date AS date,
    le.title_ar AS title,
    le.description_ar AS description,
    le.event_type AS type,
    COALESCE(p.full_name_ar, inst.name_ar) AS entity,
    d.official_number AS reference_number,
    CASE 
      WHEN le.event_type = 'appointment' THEN 'bg-green-500'
      WHEN le.event_type = 'law' THEN 'bg-blue-500'
      WHEN le.event_type = 'repeal' THEN 'bg-red-500'
      ELSE 'bg-gray-500'
    END AS color
  FROM public.legal_events le
  LEFT JOIN public.persons p ON p.id = le.person_id
  LEFT JOIN public.institutions inst ON inst.id = le.institution_id
  LEFT JOIN public.documents d ON d.id = le.document_id;

-- ============================================================
-- Search Vector Triggers (replaces GENERATED ALWAYS AS)
-- ============================================================

-- Institutions search_vector
CREATE OR REPLACE FUNCTION update_institutions_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.name_fr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.short_name_ar, '') || ' ' || COALESCE(NEW.short_name_fr, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.code, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_institutions_search_vector ON public.institutions;
CREATE TRIGGER trig_institutions_search_vector
  BEFORE INSERT OR UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION update_institutions_search_vector();

-- Persons search_vector
CREATE OR REPLACE FUNCTION update_persons_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.full_name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.full_name_fr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.biography_ar, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_persons_search_vector ON public.persons;
CREATE TRIGGER trig_persons_search_vector
  BEFORE INSERT OR UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION update_persons_search_vector();

-- Documents search_vector
CREATE OR REPLACE FUNCTION update_documents_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title_ar, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.title_fr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.official_number, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.summary_ar, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.summary_fr, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content_ar, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content_fr, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_documents_search_vector ON public.documents;
CREATE TRIGGER trig_documents_search_vector
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_documents_search_vector();

-- Appointments search_vector
CREATE OR REPLACE FUNCTION update_appointments_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.person_name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.person_name_fr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.position_title_ar, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.position_title_fr, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.institution_name_ar, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.wilaya_ar, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_appointments_search_vector ON public.appointments;
CREATE TRIGGER trig_appointments_search_vector
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_appointments_search_vector();




