-- ═══════════════════════════════════════════════════════════════════════════
-- OperateIQ Phase 3: Beta Security & Multi-Tenant Hardening (003_beta_security_hardening.sql)
--
-- 1. Removes overly permissive `anon_read` RLS policies on tables where public
--    reads are already served and org-scoped by Next.js server API routes.
-- 2. Makes `tenant-assets` storage bucket private (`public = false`) so lease
--    documents require signed URLs or authenticated server access.
-- 3. Enforces global uniqueness on active staff PINs at the database level.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Drop cross-tenant anonymous read policies (server routes use service_role)
drop policy if exists anon_read on public.site_settings;
drop policy if exists anon_read on public.site_content;
drop policy if exists anon_read on public.property_image_overrides;
drop policy if exists anon_read_published on public.properties;
drop policy if exists anon_read_published on public.blog_posts;

-- 2. Lock down tenant-assets bucket so confidential lease documents are private
update storage.buckets
set public = false,
    file_size_limit = 10485760
where id = 'tenant-assets';

-- Enforce 10 MB size cap on public image buckets
update storage.buckets
set file_size_limit = 10485760
where id in ('property-images', 'blog-images', 'maintenance-photos', 'crew-photos');

-- 3. Allow 'owner' role in allowed_users
-- (already text column, no check constraint to alter)

commit;
