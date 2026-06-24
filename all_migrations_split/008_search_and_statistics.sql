-- ============================================================
-- Migration 008: Search Index & Statistics
-- ============================================================

-- ------------------------------------
-- SEARCH INDEX
-- Materialized, denormalized search table for ultra-fast queries.
-- Rebuilt periodically or on document change via trigger/cron.
-- Designed for billions of search operations.
-- ------------------------------------
CREATE TABLE search_index (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What is indexed
  entity_type       VARCHAR(50) NOT NULL,                         -- 'document', 'person', 'institution', 'appointment'
  entity_id         UUID NOT NULL,
  
  -- Denormalized display data (avoid JOINs at query time)
  display_title_ar  TEXT,
  display_title_fr  TEXT,
  display_snippet_ar TEXT,                                        -- 200-char excerpt
  display_snippet_fr TEXT,
  document_type     document_type,
  document_date     DATE,
  issue_number      INTEGER,
  institution_name_ar TEXT,
  institution_name_fr TEXT,
  status            document_status,
  
  -- Search vectors (combined for the entity)
  search_vector_ar  TSVECTOR,                                     -- Arabic FTS
  search_vector_fr  TSVECTOR,                                     -- French FTS
  search_vector_en  TSVECTOR,                                     -- English FTS (future)
  
  -- Ranking signals
  popularity_score  NUMERIC(10, 4) DEFAULT 0,                    -- Based on view counts
  relevance_boost   NUMERIC(5, 4) DEFAULT 1.0,                   -- Manual editorial boost
  
  -- Timestamps
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_updated_at TIMESTAMPTZ,
  
  -- Prevent duplicate index entries
  CONSTRAINT search_index_unique_entity UNIQUE (entity_type, entity_id)
);

-- Primary search index — the most important index in the database
CREATE INDEX idx_search_vector_ar   ON search_index USING GIN(search_vector_ar);
CREATE INDEX idx_search_vector_fr   ON search_index USING GIN(search_vector_fr);
CREATE INDEX idx_search_vector_en   ON search_index USING GIN(search_vector_en);

-- Filtering
CREATE INDEX idx_search_entity_type ON search_index(entity_type);
CREATE INDEX idx_search_doc_type    ON search_index(document_type);
CREATE INDEX idx_search_status      ON search_index(status);
CREATE INDEX idx_search_date        ON search_index(document_date DESC);
CREATE INDEX idx_search_issue       ON search_index(issue_number DESC);
CREATE INDEX idx_search_popularity  ON search_index(popularity_score DESC);

-- Composite for ranked filtered searches (most common query pattern)
CREATE INDEX idx_search_type_date_rank ON search_index(document_type, document_date DESC, popularity_score DESC)
  WHERE status = 'published';


-- ------------------------------------
-- SEARCH QUERY LOG (AI Search audit + analytics)
-- ------------------------------------
CREATE TABLE search_queries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who searched (anonymous or authenticated)
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id      TEXT,
  ip_address      INET,
  
  -- The query
  query_text      TEXT NOT NULL,
  query_language  language_code DEFAULT 'ar',
  query_type      VARCHAR(50) DEFAULT 'fulltext',                 -- 'fulltext', 'ai', 'filter', 'autocomplete'
  
  -- Filters applied
  filters         JSONB,                                          -- {type, date_range, institution_id, status, ...}
  
  -- Results
  result_count    INTEGER,
  result_ids      UUID[],                                         -- First 10 result UUIDs
  clicked_result_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- AI-specific
  ai_intent       TEXT,                                           -- AI-classified user intent
  ai_response     TEXT,                                           -- AI-generated answer snippet
  ai_model        TEXT,                                           -- Which model answered
  ai_tokens_used  INTEGER,
  
  -- Performance
  duration_ms     INTEGER,
  
  -- Timestamp
  searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_queries_user     ON search_queries(user_id);
CREATE INDEX idx_search_queries_date     ON search_queries(searched_at DESC);
CREATE INDEX idx_search_queries_type     ON search_queries(query_type);
CREATE INDEX idx_search_queries_lang     ON search_queries(query_language);
CREATE INDEX idx_search_queries_text_trgm ON search_queries USING GIN(query_text gin_trgm_ops);

-- Partition by month for massive scale (comment out if Supabase plan doesn't support)
-- CREATE TABLE search_queries_2024_01 PARTITION OF search_queries
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');


-- ------------------------------------
-- STATISTICS (pre-aggregated metrics)
-- ------------------------------------
CREATE TABLE statistics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What this stat is for
  stat_key        VARCHAR(100) NOT NULL,                          -- e.g. 'documents_by_type', 'issues_by_year', 'appointments_by_institution'
  period          stats_period NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  -- Dimensions (optional grouping)
  dimension_type  VARCHAR(50),                                    -- e.g. 'document_type', 'institution', 'year'
  dimension_value TEXT,                                           -- e.g. 'law', 'MIN-INT', '2024'
  institution_id  UUID REFERENCES institutions(id) ON DELETE SET NULL,
  
  -- Values
  count           BIGINT DEFAULT 0,
  total_pages     BIGINT DEFAULT 0,
  total_words     BIGINT DEFAULT 0,
  
  -- Additional payload
  data            JSONB,                                          -- Flexible extra stats
  
  -- Freshness
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT statistics_unique UNIQUE (stat_key, period, period_start, dimension_type, dimension_value)
);

CREATE INDEX idx_statistics_key         ON statistics(stat_key);
CREATE INDEX idx_statistics_period      ON statistics(period, period_start DESC);
CREATE INDEX idx_statistics_institution ON statistics(institution_id);
CREATE INDEX idx_statistics_dimension   ON statistics(dimension_type, dimension_value);

COMMENT ON TABLE statistics IS 'Pre-aggregated statistics table. Populated by scheduled cron jobs or database triggers. Never query live data for dashboards — always read from here.';


-- ------------------------------------
-- PAGE VIEW ANALYTICS (lightweight)
-- ------------------------------------
CREATE TABLE page_views (
  id              UUID NOT NULL DEFAULT uuid_generate_v4(),
  
  -- What was viewed
  entity_type     VARCHAR(50) NOT NULL,                           -- 'document', 'issue', 'person', 'institution'
  entity_id       UUID NOT NULL,
  
  -- Who viewed
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id      TEXT,
  
  -- Context
  referrer        TEXT,
  user_agent      TEXT,
  
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (id, viewed_at)
) PARTITION BY RANGE (viewed_at);

-- Create initial partitions (by quarter)
CREATE TABLE page_views_2024_q1 PARTITION OF page_views
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE page_views_2024_q2 PARTITION OF page_views
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE page_views_2024_q3 PARTITION OF page_views
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE page_views_2024_q4 PARTITION OF page_views
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE page_views_2025    PARTITION OF page_views
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE page_views_2026    PARTITION OF page_views
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE page_views_future  PARTITION OF page_views
  FOR VALUES FROM ('2027-01-01') TO ('2099-01-01');

-- Indexes on each partition (auto-applied via parent)
CREATE INDEX idx_page_views_entity   ON page_views(entity_type, entity_id);
CREATE INDEX idx_page_views_user     ON page_views(user_id);
CREATE INDEX idx_page_views_time     ON page_views(viewed_at DESC);

COMMENT ON TABLE page_views IS 'Partitioned by quarter for efficient archival and pruning. Always insert into parent table; PostgreSQL routes to correct partition automatically.';

-- ------------------------------------
-- TABLE: legal_topics
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_topics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                TEXT UNIQUE NOT NULL,
    name_ar             TEXT NOT NULL,
    name_fr             TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

INSERT INTO public.legal_topics (code, name_ar, name_fr) VALUES
  ('mining', 'المعادن والمحاجر', 'Mines et carrières'),
  ('public_finance', 'المالية العامة', 'Finances publiques'),
  ('administration', 'الإدارة العامة والتعيينات', 'Administration publique')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------
-- TABLE: document_topics
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.document_topics (
    document_id         UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    topic_id            UUID REFERENCES public.legal_topics(id) ON DELETE CASCADE,
    confidence          REAL DEFAULT 1.0,
    PRIMARY KEY (document_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_document_topics_doc ON public.document_topics(document_id);
CREATE INDEX IF NOT EXISTS idx_document_topics_top ON public.document_topics(topic_id);


