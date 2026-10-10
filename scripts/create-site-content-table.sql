-- =========================================================
-- site_content — CMS editable content overrides
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =========================================================

CREATE TABLE IF NOT EXISTS site_content (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section    text NOT NULL,          -- e.g. "hero", "stats", "services", "footer"
  key        text NOT NULL,          -- e.g. "headline", "subtext"
  value      text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key)
);

-- Enable RLS (deny all public access, only service-role key can read/write)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Allow the API to read content for rendering (public read is fine since it's site content)
CREATE POLICY "Allow public read of site content"
  ON site_content FOR SELECT
  USING (true);

-- Only service-role key can insert/update/delete
-- (no INSERT/UPDATE/DELETE policies = denied for anon/authenticated roles)

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_site_content_section ON site_content(section);

-- Done!
SELECT 'site_content table created successfully' AS result;
