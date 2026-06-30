-- ============================================================
-- Migration 021: Add NGO/Civil Society sector distinction
-- ============================================================

-- Add 'ngo' and 'civil_society' to institution_category enum
ALTER TYPE institution_category ADD VALUE IF NOT EXISTS 'ngo';
ALTER TYPE institution_category ADD VALUE IF NOT EXISTS 'civil_society';
ALTER TYPE institution_category ADD VALUE IF NOT EXISTS 'political_party';

-- Add sector column to institutions to clearly separate state vs civil society
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'state'
  CHECK (sector IN ('state', 'civil_society', 'international', 'unknown'));

-- Add sector column to persons to clearly separate state officials vs civil society figures
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'state'
  CHECK (sector IN ('state', 'civil_society', 'international', 'unknown'));

-- Index for fast filtering by sector
CREATE INDEX IF NOT EXISTS idx_institutions_sector ON institutions(sector);
CREATE INDEX IF NOT EXISTS idx_persons_sector ON persons(sector);

-- Update existing institutions: ngo/civil_society categories get sector = 'civil_society'
UPDATE institutions
SET sector = 'civil_society'
WHERE category IN ('ngo', 'civil_society');
