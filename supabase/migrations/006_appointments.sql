-- ============================================================
-- Migration 006: Appointments
-- ============================================================

CREATE TABLE appointments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to base document (the decree/decision that contains this appointment)
  document_id             UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- The person being appointed
  person_id               UUID REFERENCES persons(id) ON DELETE SET NULL,
  
  -- Name as it appears in the official text (may differ from persons table)
  person_name_ar          TEXT NOT NULL,
  person_name_fr          TEXT,
  
  -- Position / role
  appointment_type        appointment_type NOT NULL DEFAULT 'nomination',
  position_title_ar       TEXT NOT NULL,
  position_title_fr       TEXT,
  position_title_en       TEXT,
  position_grade_ar       TEXT,                                   -- Civil service grade
  position_grade_fr       TEXT,
  
  -- Institution
  institution_id          UUID REFERENCES institutions(id) ON DELETE SET NULL,
  institution_name_ar     TEXT,                                   -- As it appears in the text
  institution_name_fr     TEXT,
  
  -- Department / division within institution
  department_ar           TEXT,
  department_fr           TEXT,
  
  -- Geographic scope
  location_ar             TEXT,
  location_fr             TEXT,
  wilaya_ar               TEXT,                                   -- Mauritanian region (wilaya)
  wilaya_fr               TEXT,
  
  -- Dates
  appointment_date        DATE NOT NULL,
  effective_date          DATE,
  end_date                DATE,
  
  -- Previous position (for transfers)
  previous_position_ar    TEXT,
  previous_position_fr    TEXT,
  previous_institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  
  -- Replacing whom
  replacing_person_id     UUID REFERENCES persons(id) ON DELETE SET NULL,
  replacing_name_ar       TEXT,
  
  -- Salary grade / index
  salary_index            VARCHAR(20),
  salary_grade            VARCHAR(20),
  
  -- Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Search vector
  search_vector           TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('arabic', COALESCE(person_name_ar, '')), 'A')     ||
    setweight(to_tsvector('french', COALESCE(person_name_fr, '')), 'A')     ||
    setweight(to_tsvector('arabic', COALESCE(position_title_ar, '')), 'B')  ||
    setweight(to_tsvector('french', COALESCE(position_title_fr, '')), 'B')  ||
    setweight(to_tsvector('arabic', COALESCE(institution_name_ar, '')), 'B')||
    setweight(to_tsvector('arabic', COALESCE(wilaya_ar, '')), 'C')
  ) STORED
);

-- Indexes
CREATE INDEX idx_appointments_document_id      ON appointments(document_id);
CREATE INDEX idx_appointments_person_id        ON appointments(person_id);
CREATE INDEX idx_appointments_institution_id   ON appointments(institution_id);
CREATE INDEX idx_appointments_type             ON appointments(appointment_type);
CREATE INDEX idx_appointments_date             ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_effective_date   ON appointments(effective_date DESC);
CREATE INDEX idx_appointments_replacing        ON appointments(replacing_person_id);
CREATE INDEX idx_appointments_prev_institution ON appointments(previous_institution_id);
CREATE INDEX idx_appointments_search           ON appointments USING GIN(search_vector);
CREATE INDEX idx_appointments_name_ar_trgm     ON appointments USING GIN(person_name_ar gin_trgm_ops);
CREATE INDEX idx_appointments_name_fr_trgm     ON appointments USING GIN(person_name_fr gin_trgm_ops);
CREATE INDEX idx_appointments_title_ar_trgm    ON appointments USING GIN(position_title_ar gin_trgm_ops);

-- Trigger
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE appointments IS 'Individual appointments extracted from decrees and decisions. Multiple appointments can exist in a single document.';
COMMENT ON COLUMN appointments.person_name_ar IS 'Name as written in the official text. May not match persons.full_name_ar exactly.';
