-- ============================================================
-- Migration 009: User Profiles & Bookmarks
-- ============================================================

-- ------------------------------------
-- PROFILES (extends auth.users)
-- ------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Display info
  display_name    TEXT,
  avatar_url      TEXT,
  
  -- Preferences
  preferred_language  language_code NOT NULL DEFAULT 'ar',
  preferred_theme     VARCHAR(20) DEFAULT 'system',              -- 'light', 'dark', 'system'
  
  -- Role & permissions
  role            VARCHAR(50) NOT NULL DEFAULT 'reader',         -- 'reader', 'editor', 'admin', 'super_admin'
  
  -- Contact
  phone           TEXT,
  organization    TEXT,
  job_title       TEXT,
  
  -- Activity stats
  search_count    INTEGER DEFAULT 0,
  last_active_at  TIMESTAMPTZ,
  
  -- Notifications
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'language')::language_code, 'ar')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ------------------------------------
-- BOOKMARKS (saved documents / persons / institutions)
-- ------------------------------------
CREATE TABLE bookmarks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What is bookmarked (one must be set)
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  person_id       UUID REFERENCES persons(id) ON DELETE CASCADE,
  institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,
  issue_id        UUID REFERENCES issues(id) ON DELETE CASCADE,
  
  -- Organization
  collection_name TEXT DEFAULT 'default',
  note            TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT bookmarks_one_entity CHECK (
    (document_id IS NOT NULL)::INT +
    (person_id IS NOT NULL)::INT +
    (institution_id IS NOT NULL)::INT +
    (issue_id IS NOT NULL)::INT = 1
  )
);

CREATE INDEX idx_bookmarks_user         ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_document     ON bookmarks(document_id);
CREATE INDEX idx_bookmarks_person       ON bookmarks(person_id);
CREATE INDEX idx_bookmarks_collection   ON bookmarks(user_id, collection_name);

-- Prevent duplicate bookmarks for same user + entity
CREATE UNIQUE INDEX idx_bookmarks_user_document     ON bookmarks(user_id, document_id)     WHERE document_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bookmarks_user_person       ON bookmarks(user_id, person_id)       WHERE person_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bookmarks_user_institution  ON bookmarks(user_id, institution_id)  WHERE institution_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bookmarks_user_issue        ON bookmarks(user_id, issue_id)        WHERE issue_id IS NOT NULL;


-- ------------------------------------
-- ALERTS (user-defined change notifications)
-- ------------------------------------
CREATE TABLE user_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What to watch
  alert_type      VARCHAR(50) NOT NULL,                          -- 'new_document', 'status_change', 'new_appointment', 'keyword_match'
  
  -- Filter criteria (JSON for flexibility)
  criteria        JSONB NOT NULL,                                 -- {document_type, institution_id, keywords, person_id, ...}
  
  -- Delivery
  channel         VARCHAR(20) DEFAULT 'email',                   -- 'email', 'in_app', 'both'
  is_active       BOOLEAN DEFAULT TRUE,
  
  -- Tracking
  last_triggered_at TIMESTAMPTZ,
  trigger_count   INTEGER DEFAULT 0,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user     ON user_alerts(user_id);
CREATE INDEX idx_alerts_type     ON user_alerts(alert_type);
CREATE INDEX idx_alerts_active   ON user_alerts(is_active);
CREATE INDEX idx_alerts_criteria ON user_alerts USING GIN(criteria);


