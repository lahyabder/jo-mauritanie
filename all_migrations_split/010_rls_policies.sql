-- ============================================================
-- Migration 010: Row-Level Security (RLS) Policies
-- ============================================================

-- ------------------------------------
-- Enable RLS on all user-facing tables
-- ------------------------------------
ALTER TABLE issues              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE laws                ENABLE ROW LEVEL SECURITY;
ALTER TABLE decrees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars           ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_relations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_persons    ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index        ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts         ENABLE ROW LEVEL SECURITY;

-- ------------------------------------
-- Helper: check if current user has admin role
-- ------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin')
     FROM profiles WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_editor_or_above()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('editor', 'admin', 'super_admin')
     FROM profiles WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PUBLIC READ POLICIES (published content is open to everyone)
-- ============================================================

-- ISSUES: public read for published issues
CREATE POLICY "issues_public_read" ON issues
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "issues_admin_all" ON issues
  FOR ALL USING (is_admin());

-- DOCUMENTS: public read for published, current versions only
CREATE POLICY "documents_public_read" ON documents
  FOR SELECT USING (
    status = 'published'
    AND is_current_version = TRUE
    AND is_confidential = FALSE
  );

CREATE POLICY "documents_editor_draft_read" ON documents
  FOR SELECT USING (
    is_editor_or_above()
  );

CREATE POLICY "documents_editor_write" ON documents
  FOR INSERT WITH CHECK (is_editor_or_above());

CREATE POLICY "documents_editor_update" ON documents
  FOR UPDATE USING (is_editor_or_above());

CREATE POLICY "documents_admin_delete" ON documents
  FOR DELETE USING (is_admin());

-- TYPE-SPECIFIC TABLES: inherit visibility from parent documents
CREATE POLICY "laws_public_read" ON laws
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = laws.document_id
        AND d.status = 'published'
        AND d.is_current_version = TRUE
    )
  );
CREATE POLICY "laws_editor_all" ON laws FOR ALL USING (is_editor_or_above());

CREATE POLICY "decrees_public_read" ON decrees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = decrees.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "decrees_editor_all" ON decrees FOR ALL USING (is_editor_or_above());

CREATE POLICY "decisions_public_read" ON decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = decisions.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "decisions_editor_all" ON decisions FOR ALL USING (is_editor_or_above());

CREATE POLICY "regulations_public_read" ON regulations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = regulations.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "regulations_editor_all" ON regulations FOR ALL USING (is_editor_or_above());

CREATE POLICY "circulars_public_read" ON circulars
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = circulars.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "circulars_editor_all" ON circulars FOR ALL USING (is_editor_or_above());

CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = announcements.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "announcements_editor_all" ON announcements FOR ALL USING (is_editor_or_above());

CREATE POLICY "notifications_public_read" ON notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = notifications.document_id AND d.status = 'published' AND d.is_current_version = TRUE)
  );
CREATE POLICY "notifications_editor_all" ON notifications FOR ALL USING (is_editor_or_above());

-- APPOINTMENTS: public read
CREATE POLICY "appointments_public_read" ON appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents d WHERE d.id = appointments.document_id AND d.status = 'published')
  );
CREATE POLICY "appointments_editor_all" ON appointments FOR ALL USING (is_editor_or_above());

-- PERSONS: public read (active persons)
CREATE POLICY "persons_public_read" ON persons
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "persons_editor_all" ON persons FOR ALL USING (is_editor_or_above());

-- INSTITUTIONS: public read (active)
CREATE POLICY "institutions_public_read" ON institutions
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "institutions_editor_all" ON institutions FOR ALL USING (is_editor_or_above());

-- ALIASES: public read
CREATE POLICY "aliases_public_read" ON aliases FOR SELECT USING (TRUE);
CREATE POLICY "aliases_editor_all"  ON aliases FOR ALL USING (is_editor_or_above());

-- RELATIONS: public read
CREATE POLICY "doc_relations_public_read" ON document_relations FOR SELECT USING (TRUE);
CREATE POLICY "doc_relations_editor_all"  ON document_relations FOR ALL USING (is_editor_or_above());

CREATE POLICY "law_relations_public_read" ON law_relations FOR SELECT USING (TRUE);
CREATE POLICY "law_relations_editor_all"  ON law_relations FOR ALL USING (is_editor_or_above());

-- DOCUMENT VERSIONS: public read
CREATE POLICY "doc_versions_public_read" ON document_versions FOR SELECT USING (TRUE);
CREATE POLICY "doc_versions_editor_all"  ON document_versions FOR ALL USING (is_editor_or_above());

-- JUNCTION TABLES: public read
CREATE POLICY "doc_persons_public_read"       ON document_persons       FOR SELECT USING (TRUE);
CREATE POLICY "doc_persons_editor_all"        ON document_persons       FOR ALL USING (is_editor_or_above());
CREATE POLICY "doc_institutions_public_read"  ON document_institutions  FOR SELECT USING (TRUE);
CREATE POLICY "doc_institutions_editor_all"   ON document_institutions  FOR ALL USING (is_editor_or_above());

-- SEARCH INDEX: public read
CREATE POLICY "search_index_public_read" ON search_index FOR SELECT USING (TRUE);
CREATE POLICY "search_index_admin_all"   ON search_index FOR ALL USING (is_admin());

-- STATISTICS: public read
CREATE POLICY "statistics_public_read" ON statistics FOR SELECT USING (TRUE);
CREATE POLICY "statistics_admin_all"   ON statistics FOR ALL USING (is_admin());

-- SEARCH QUERIES: users see only their own, admins see all
CREATE POLICY "search_queries_own_read" ON search_queries
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "search_queries_insert" ON search_queries
  FOR INSERT WITH CHECK (TRUE);                                   -- Anyone can log a search

-- PROFILES: users see own, admins see all
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- BOOKMARKS: users manage only their own
CREATE POLICY "bookmarks_own" ON bookmarks
  FOR ALL USING (user_id = auth.uid());

-- USER ALERTS: users manage only their own
CREATE POLICY "alerts_own" ON user_alerts
  FOR ALL USING (user_id = auth.uid());


