-- ============================================================
-- Migration 001: Extensions & Custom Types
-- Observatoire Intelligent du Journal Officiel Mauritanien
-- ============================================================

-- ------------------------------------
-- Enable required PostgreSQL extensions
-- ------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";         -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- Trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";          -- Accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "btree_gin";         -- GIN indexes on btree types
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance tracking

-- ------------------------------------
-- Document type enum
-- ------------------------------------
CREATE TYPE document_type AS ENUM (
  'law',
  'decree',
  'decision',
  'regulation',
  'circular',
  'announcement',
  'notification',
  'appointment',
  'other'
);

-- ------------------------------------
-- Document status lifecycle
-- ------------------------------------
CREATE TYPE document_status AS ENUM (
  'draft',          -- Not yet published
  'published',      -- Active and in force
  'amended',        -- Modified by another document
  'repealed',       -- Fully revoked
  'suspended',      -- Temporarily suspended
  'archived'        -- Historical, no longer active
);

-- ------------------------------------
-- Language codes (BCP-47 style)
-- ------------------------------------
CREATE TYPE language_code AS ENUM (
  'ar',   -- Arabic
  'fr',   -- French
  'en'    -- English (future)
);

-- ------------------------------------
-- Relationship types between documents
-- ------------------------------------
CREATE TYPE relation_type AS ENUM (
  'amends',         -- Document A amends Document B
  'repeals',        -- Document A repeals Document B
  'implements',     -- Document A implements Document B
  'supplements',    -- Document A supplements Document B
  'references',     -- Document A references Document B
  'supersedes',     -- Document A supersedes Document B
  'consolidates',   -- Document A consolidates Document B
  'suspends'        -- Document A suspends Document B
);

-- ------------------------------------
-- Institution category
-- ------------------------------------
CREATE TYPE institution_category AS ENUM (
  'ministry',
  'presidency',
  'parliament',
  'constitutional_council',
  'supreme_court',
  'public_agency',
  'regional_authority',
  'municipality',
  'public_enterprise',
  'other'
);

-- ------------------------------------
-- Person role
-- ------------------------------------
CREATE TYPE person_role AS ENUM (
  'president',
  'prime_minister',
  'minister',
  'secretary_general',
  'director',
  'judge',
  'official',
  'ambassador',
  'governor',
  'other'
);

-- ------------------------------------
-- Appointment type
-- ------------------------------------
CREATE TYPE appointment_type AS ENUM (
  'nomination',
  'promotion',
  'transfer',
  'dismissal',
  'retirement',
  'delegation',
  'other'
);

-- ------------------------------------
-- Statistics period granularity
-- ------------------------------------
CREATE TYPE stats_period AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);
