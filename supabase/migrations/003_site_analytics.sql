-- ══════════════════════════════════════════════════════════════════════════════
-- Vision LLC — Internal Site Analytics
-- Stores anonymous user behavior events: page views, scroll depth, clicks, etc.
-- Session IDs are anonymous cookies — no PII until user submits a form.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_analytics (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL,                  -- anonymous browser session (UUID cookie)
  event_type    TEXT NOT NULL,                  -- 'page_view', 'scroll_depth', 'cta_click', 'property_click', 'session_end'
  page_path     TEXT NOT NULL DEFAULT '/',      -- e.g. '/', '/about', '/properties/310-state-street'
  page_title    TEXT,                           -- document.title
  referrer      TEXT,                           -- document.referrer (where they came from)
  utm_source    TEXT,                           -- utm_source param
  utm_medium    TEXT,                           -- utm_medium param
  utm_campaign  TEXT,                           -- utm_campaign param
  event_data    JSONB DEFAULT '{}',             -- flexible payload: { scroll_pct: 75, button: "Schedule Tour", property_id: "310-state" }
  duration_ms   INTEGER DEFAULT 0,             -- time on page in milliseconds
  device_type   TEXT DEFAULT 'desktop',        -- 'mobile', 'tablet', 'desktop'
  screen_width  INTEGER,                       -- viewport width for responsive analysis
  created_at    TIMESTAMPTZ DEFAULT NOW()       -- when the event fired
);

-- ── Indexes for fast admin queries ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_session   ON site_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event     ON site_analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created   ON site_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page      ON site_analytics (page_path);

-- ── Session summary view (for the admin dashboard) ──────────────────────────
CREATE OR REPLACE VIEW session_summary AS
SELECT
  session_id,
  MIN(created_at)                                                 AS first_seen,
  MAX(created_at)                                                 AS last_seen,
  EXTRACT(EPOCH FROM MAX(created_at) - MIN(created_at)) * 1000    AS total_duration_ms,
  COUNT(*) FILTER (WHERE event_type = 'page_view')                AS page_views,
  COUNT(*) FILTER (WHERE event_type = 'cta_click')                AS cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'property_click')           AS property_clicks,
  MAX((event_data->>'scroll_pct')::int)                           AS max_scroll_pct,
  ARRAY_AGG(DISTINCT page_path) FILTER (WHERE event_type = 'page_view') AS pages_visited,
  (ARRAY_AGG(referrer ORDER BY created_at ASC))[1]                AS entry_referrer,
  (ARRAY_AGG(utm_source ORDER BY created_at ASC))[1]              AS utm_source,
  (ARRAY_AGG(utm_medium ORDER BY created_at ASC))[1]              AS utm_medium,
  (ARRAY_AGG(utm_campaign ORDER BY created_at ASC))[1]            AS utm_campaign,
  (ARRAY_AGG(device_type ORDER BY created_at ASC))[1]             AS device_type
FROM site_analytics
GROUP BY session_id;

-- ── Add session_id column to leads table for correlation ────────────────────
-- (safe to run even if column already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN session_id TEXT;
    CREATE INDEX idx_leads_session ON leads (session_id);
  END IF;
END $$;

-- Also add to contact_submissions if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_submissions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'contact_submissions' AND column_name = 'session_id'
    ) THEN
      ALTER TABLE contact_submissions ADD COLUMN session_id TEXT;
    END IF;
  END IF;
END $$;
