-- ============================================================
-- Migration 005: Type-Specific Extension Tables
-- Each extends `documents` with domain-specific columns.
-- These are 1:1 with documents (same UUID as PK).
-- ============================================================

-- ------------------------------------
-- LAWS (Lois)
-- ------------------------------------
CREATE TABLE laws (
  document_id         UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Law-specific identification
  law_number          TEXT,                                       -- e.g. "2024-001"
  law_year            SMALLINT,
  
  -- Classification
  law_domain_ar       TEXT,                                       -- e.g. "قانون مالي"
  law_domain_fr       TEXT,                                       -- e.g. "Droit financier"
  law_domain_en       TEXT,
  
  -- Constitutional reference
  constitutional_basis_ar TEXT,
  constitutional_basis_fr TEXT,
  
  -- Parliament info
  parliament_session  TEXT,
  vote_date           DATE,
  vote_result         TEXT,                                       -- "adopted", "rejected", etc.
  promulgation_date   DATE,
  
  -- Scope
  is_organic_law      BOOLEAN DEFAULT FALSE,                      -- Loi organique
  is_finance_law      BOOLEAN DEFAULT FALSE,                      -- Loi de finances
  articles_count      INTEGER,
  
  -- Amendments
  last_amendment_date DATE,
  amendment_count     INTEGER DEFAULT 0
);

CREATE INDEX idx_laws_year         ON laws(law_year DESC);
CREATE INDEX idx_laws_domain_ar    ON laws USING GIN(law_domain_ar gin_trgm_ops);
CREATE INDEX idx_laws_organic      ON laws(is_organic_law);
CREATE INDEX idx_laws_finance      ON laws(is_finance_law);


-- ------------------------------------
-- DECREES (Décrets)
-- ------------------------------------
CREATE TABLE decrees (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Decree-specific
  decree_number         TEXT,                                     -- e.g. "2024-123"
  decree_year           SMALLINT,
  decree_type_ar        TEXT,                                     -- "مرسوم رئاسي" / "مرسوم وزاري"
  decree_type_fr        TEXT,                                     -- "Décret présidentiel" / "Décret ministériel"
  
  -- Signatory
  signed_by_person_id   UUID REFERENCES persons(id) ON DELETE SET NULL,
  signed_by_title_ar    TEXT,
  signed_by_title_fr    TEXT,
  countersigned_by      TEXT[],                                   -- Array of countersigning ministers
  
  -- Content specifics
  articles_count        INTEGER,
  is_regulatory         BOOLEAN DEFAULT FALSE,
  is_executive          BOOLEAN DEFAULT FALSE,
  
  -- Implementation
  implements_law_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
  implementation_deadline DATE
);

CREATE INDEX idx_decrees_year          ON decrees(decree_year DESC);
CREATE INDEX idx_decrees_signed_by     ON decrees(signed_by_person_id);
CREATE INDEX idx_decrees_implements    ON decrees(implements_law_id);


-- ------------------------------------
-- DECISIONS (Décisions)
-- ------------------------------------
CREATE TABLE decisions (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  decision_number       TEXT,
  decision_year         SMALLINT,
  decision_type_ar      TEXT,
  decision_type_fr      TEXT,
  
  -- Issuing authority
  issuing_authority_ar  TEXT,
  issuing_authority_fr  TEXT,
  signed_by_person_id   UUID REFERENCES persons(id) ON DELETE SET NULL,
  
  -- Scope
  is_individual         BOOLEAN DEFAULT FALSE,                    -- Individual vs. general decision
  beneficiary_name_ar   TEXT,
  beneficiary_name_fr   TEXT,
  beneficiary_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  subject_ar            TEXT,
  subject_fr            TEXT
);

CREATE INDEX idx_decisions_year        ON decisions(decision_year DESC);
CREATE INDEX idx_decisions_signed_by   ON decisions(signed_by_person_id);
CREATE INDEX idx_decisions_beneficiary ON decisions(beneficiary_person_id);


-- ------------------------------------
-- REGULATIONS (Règlements)
-- ------------------------------------
CREATE TABLE regulations (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  regulation_number     TEXT,
  regulation_year       SMALLINT,
  regulation_type_ar    TEXT,
  regulation_type_fr    TEXT,
  
  -- Regulatory domain
  domain_ar             TEXT,
  domain_fr             TEXT,
  scope_ar              TEXT,                                     -- Geographic/functional scope
  scope_fr              TEXT,
  
  -- Technical details
  articles_count        INTEGER,
  annexes_count         INTEGER DEFAULT 0,
  is_temporary          BOOLEAN DEFAULT FALSE,
  temporary_duration_months INTEGER
);

CREATE INDEX idx_regulations_year    ON regulations(regulation_year DESC);
CREATE INDEX idx_regulations_domain  ON regulations USING GIN(domain_ar gin_trgm_ops);


-- ------------------------------------
-- CIRCULARS (Circulaires)
-- ------------------------------------
CREATE TABLE circulars (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  circular_number       TEXT,
  circular_year         SMALLINT,
  
  -- Addressees
  addressed_to_ar       TEXT[],                                   -- Array of addresses (Arabic)
  addressed_to_fr       TEXT[],
  
  -- Subject
  subject_ar            TEXT,
  subject_fr            TEXT,
  
  -- Related decree/law
  related_law_id        UUID REFERENCES documents(id) ON DELETE SET NULL,
  signed_by_person_id   UUID REFERENCES persons(id) ON DELETE SET NULL,
  signed_by_title_ar    TEXT,
  signed_by_title_fr    TEXT
);

CREATE INDEX idx_circulars_year        ON circulars(circular_year DESC);
CREATE INDEX idx_circulars_signed_by   ON circulars(signed_by_person_id);
CREATE INDEX idx_circulars_related_law ON circulars(related_law_id);


-- ------------------------------------
-- ANNOUNCEMENTS (Annonces)
-- ------------------------------------
CREATE TABLE announcements (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  announcement_type_ar  TEXT,
  announcement_type_fr  TEXT,
  
  -- Tender / procurement specifics
  is_tender             BOOLEAN DEFAULT FALSE,
  tender_reference      TEXT,
  tender_deadline       DATE,
  tender_budget_mrm     NUMERIC(18, 2),                          -- Amount in Mauritanian Ouguiya
  
  -- Contact
  contact_info_ar       TEXT,
  contact_info_fr       TEXT,
  contact_email         TEXT,
  contact_phone         TEXT
);

CREATE INDEX idx_announcements_tender   ON announcements(is_tender);
CREATE INDEX idx_announcements_deadline ON announcements(tender_deadline);


-- ------------------------------------
-- NOTIFICATIONS (Avis)
-- ------------------------------------
CREATE TABLE notifications (
  document_id           UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  notification_type_ar  TEXT,
  notification_type_fr  TEXT,
  
  -- Target audience
  audience_ar           TEXT,
  audience_fr           TEXT,
  
  -- Urgency / priority
  is_urgent             BOOLEAN DEFAULT FALSE,
  priority_level        SMALLINT DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
  
  -- Response deadline
  response_deadline     DATE,
  signed_by_person_id   UUID REFERENCES persons(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_urgent ON notifications(is_urgent);
CREATE INDEX idx_notifications_type   ON notifications USING GIN(notification_type_ar gin_trgm_ops);


