-- ================================================================
-- VISION LLC — Safe RLS Migration (skips tables that don't exist)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'lead_comments',
    'leads',
    'allowed_users',
    'blog_posts',
    'call_logs',
    'cleaning_assignments',
    'maintenance_tickets',
    'properties',
    'property_image_overrides',
    'site_settings',
    'tenants'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only process if the table actually exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Drop any existing loose policy with our name (idempotent)
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'deny_all_' || tbl, tbl
      );

      -- Create deny-all policy for anon + authenticated
      -- (service role key bypasses RLS, so API routes are unaffected)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false)',
        'deny_all_' || tbl, tbl
      );

      RAISE NOTICE 'RLS enabled on %', tbl;
    ELSE
      RAISE NOTICE 'SKIPPED (table does not exist): %', tbl;
    END IF;
  END LOOP;
END $$;

-- ================================================================
-- VERIFY: shows rls_enabled = true for every table that exists
-- ================================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'lead_comments','leads','allowed_users','blog_posts',
    'call_logs','cleaning_assignments','maintenance_tickets',
    'properties','property_image_overrides','site_settings','tenants'
  )
ORDER BY tablename;
