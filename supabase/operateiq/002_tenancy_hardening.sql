-- ═══════════════════════════════════════════════════════════════════════════
-- OperateIQ Phase 2: Tenancy Hardening Migration (002_tenancy_hardening.sql)
--
-- Drops the transitional default_org_id() default on all 27 business tables
-- so any new row must be explicitly stamped with its tenant org_id.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Drop transitional defaults on business tables
do $$
declare
  tbl text;
  business_tables text[] := array[
    'leads',
    'lead_comments',
    'call_logs',
    'sales_leads',
    'contact_submissions',
    'blog_posts',
    'site_content',
    'site_settings',
    'site_analytics',
    'allowed_users',
    'internal_conversations',
    'activity_log',
    'todos',
    'properties',
    'property_details',
    'property_image_overrides',
    'available_spaces',
    'parking_lots',
    'portfolio_snapshots',
    'tenants',
    'rent_payments',
    'subcontractor_contacts',
    'maintenance_tickets',
    'cleaning_assignments',
    'filter_changes',
    'building_inspections',
    'building_inspection_config'
  ];
begin
  foreach tbl in array business_tables loop
    execute format('alter table public.%I alter column org_id drop default', tbl);
  end loop;
end $$;

-- 2. Drop the transitional helper function
drop function if exists public.default_org_id();

commit;
