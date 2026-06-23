-- ============================================================
-- Migration 002: Core Tables — Institutions & Persons
-- ============================================================

-- ------------------------------------
-- INSTITUTIONS
-- ------------------------------------
CREATE TABLE institutions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  code                VARCHAR(50) UNIQUE,                         -- e.g. "MIN-INT", "MJ"
  category            institution_category NOT NULL DEFAULT 'other',
  
  -- Multilingual names
  name_ar             TEXT NOT NULL,
  name_fr             TEXT,
  name_en             TEXT,
  
  -- Multilingual short names / acronyms
  short_name_ar       TEXT,
  short_name_fr       TEXT,
  short_name_en       TEXT,
  
  -- Multilingual descriptions
  description_ar      TEXT,
  description_fr      TEXT,
  description_en      TEXT,
  
  -- Hierarchy
  parent_id           UUID REFERENCES institutions(id) ON DELETE SET NULL,
  level               SMALLINT DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  
  -- Contact & metadata
  website_url         TEXT,
  logo_url            TEXT,
  founded_date        DATE,
  dissolved_date      DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Search vector (multilingual)
  search_vector       TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('arabic', COALESCE(name_ar, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(name_fr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(short_name_ar, '') || ' ' || COALESCE(short_name_fr, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(code, '')), 'C')
  ) STORED
);

-- Indexes
CREATE INDEX idx_institutions_parent      ON institutions(parent_id);
CREATE INDEX idx_institutions_category    ON institutions(category);
CREATE INDEX idx_institutions_active      ON institutions(is_active);
CREATE INDEX idx_institutions_search      ON institutions USING GIN(search_vector);
CREATE INDEX idx_institutions_name_ar_trgm ON institutions USING GIN(name_ar gin_trgm_ops);
CREATE INDEX idx_institutions_name_fr_trgm ON institutions USING GIN(name_fr gin_trgm_ops);


-- ------------------------------------
-- PERSONS
-- ------------------------------------
CREATE TABLE persons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  national_id         VARCHAR(20) UNIQUE,                         -- National ID number if known
  
  -- Multilingual names
  full_name_ar        TEXT NOT NULL,
  full_name_fr        TEXT,
  full_name_en        TEXT,
  
  first_name_ar       TEXT,
  last_name_ar        TEXT,
  first_name_fr       TEXT,
  last_name_fr        TEXT,
  
  -- Role & affiliation
  current_role        person_role DEFAULT 'other',
  current_role_title_ar TEXT,
  current_role_title_fr TEXT,
  current_institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  
  -- Biographical
  birth_date          DATE,
  birth_place_ar      TEXT,
  birth_place_fr      TEXT,
  nationality         VARCHAR(50) DEFAULT 'MR',                   -- ISO 3166-1 alpha-2
  gender              CHAR(1) CHECK (gender IN ('M', 'F')),
  
  -- Contact
  photo_url           TEXT,
  biography_ar        TEXT,
  biography_fr        TEXT,
  
  -- Audit
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Search vector
  search_vector       TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('arabic', COALESCE(full_name_ar, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(full_name_fr, '')), 'A') ||
    setweight(to_tsvector('arabic', COALESCE(biography_ar, '')), 'C')
  ) STORED
);

-- Indexes
CREATE INDEX idx_persons_institution      ON persons(current_institution_id);
CREATE INDEX idx_persons_role             ON persons(current_role);
CREATE INDEX idx_persons_active           ON persons(is_active);
CREATE INDEX idx_persons_search           ON persons USING GIN(search_vector);
CREATE INDEX idx_persons_name_ar_trgm     ON persons USING GIN(full_name_ar gin_trgm_ops);
CREATE INDEX idx_persons_name_fr_trgm     ON persons USING GIN(full_name_fr gin_trgm_ops);


-- ------------------------------------
-- PERSON ALIASES (alternative names, maiden names, transliterations)
-- ------------------------------------
CREATE TABLE aliases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What is being aliased (person OR institution, exclusive)
  person_id       UUID REFERENCES persons(id) ON DELETE CASCADE,
  institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,
  
  -- Alias info
  alias_text      TEXT NOT NULL,
  language        language_code NOT NULL DEFAULT 'ar',
  alias_type      VARCHAR(50),                                     -- e.g. 'maiden_name', 'transliteration', 'abbreviation'
  is_preferred    BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Exactly one of person_id or institution_id must be set
  CONSTRAINT aliases_exclusive_target CHECK (
    (person_id IS NOT NULL AND institution_id IS NULL) OR
    (person_id IS NULL AND institution_id IS NOT NULL)
  )
);

CREATE INDEX idx_aliases_person      ON aliases(person_id);
CREATE INDEX idx_aliases_institution ON aliases(institution_id);
CREATE INDEX idx_aliases_text_trgm   ON aliases USING GIN(alias_text gin_trgm_ops);


-- ------------------------------------
-- Auto-update updated_at trigger function
-- ------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_institutions
  BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_persons
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
