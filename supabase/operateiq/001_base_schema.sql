-- ═══════════════════════════════════════════════════════════════════════════
-- OperateIQ — 001 Base Schema (multi-tenant)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fresh schema for the OperateIQ Supabase project. Reconstructed from the
-- application code — NOT copied from any other database.
--
-- Multi-tenancy model
--   • organizations  = one customer account (company / owner)
--   • memberships    = which auth users belong to which org (+ role)
--   • EVERY business table has org_id → organizations(id) ON DELETE CASCADE
--
-- Transition note (Phase 1–2):
--   The current API routes don't send org_id yet. Until Phase 3 wires the
--   per-request org, org_id DEFAULTs to the seeded "OperateIQ Demo" org via
--   public.default_org_id(). Phase 3 will DROP these defaults so every write
--   must carry an explicit org_id.
--
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent where practical).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Helpers
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Tenancy core
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  slug                    text not null unique,
  tier                    text not null default 'starter'
                            check (tier in ('starter','growth','pro')),
  subscription_status     text not null default 'trialing'
                            check (subscription_status in ('trialing','active','past_due','canceled','paused')),
  trial_ends_at           timestamptz default (now() + interval '14 days'),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  -- Site builder / white-label (Growth: basic, Pro: full + custom domain)
  custom_domain           text unique,
  brand_name              text,
  brand_logo_url          text,
  brand_primary_color     text default '#6366F1',
  brand_accent_color      text default '#22D3EE',
  contact_email           text,
  contact_phone           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member'
                check (role in ('owner','admin','manager','member','maintenance','cleaning')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_memberships_user on public.memberships(user_id);

-- Seed the transitional default org (fixed UUID, referenced by default_org_id()).
insert into public.organizations (id, name, slug, tier, subscription_status, trial_ends_at)
values ('00000000-0000-0000-0000-000000000001', 'OperateIQ Demo', 'operateiq-demo', 'pro', 'active', null)
on conflict (id) do nothing;

create or replace function public.default_org_id()
returns uuid language sql immutable as $$
  select '00000000-0000-0000-0000-000000000001'::uuid
$$;

-- Orgs the signed-in user belongs to (used by RLS). SECURITY DEFINER so it
-- can read memberships without recursive RLS evaluation.
create or replace function public.current_user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Leads / CRM
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                   text primary key default gen_random_uuid()::text,
  org_id               uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  "timestamp"          timestamptz not null default now(),
  name                 text not null default '',
  email                text default '',
  phone                text default '',
  space_type           text,
  budget               text,                 -- mixed: numbers & ranges like "2000-3000"
  timeline             text,
  team_size            text,
  additional_info      text default '',
  score                integer default 0,
  score_label          text,
  reasoning            text,
  matched_properties   jsonb default '[]'::jsonb,
  is_whale             boolean default false,
  whale_tier           text,
  whale_keywords       jsonb default '[]'::jsonb,
  source               text default 'organic',
  medium               text default 'direct',
  campaign             text default '',
  session_id           text,
  follow_up_date       date,
  created_by_employee  text default 'Staff',
  assigned_employee    text default '',
  progress             text default '0-25%',
  archived_at          timestamptz
);
create index if not exists idx_leads_org_ts   on public.leads(org_id, "timestamp" desc);
create index if not exists idx_leads_session  on public.leads(session_id);

create table if not exists public.lead_comments (
  id           text primary key default gen_random_uuid()::text,
  org_id       uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  lead_id      text not null,
  author       text not null default '',
  body         text not null default '',
  "timestamp"  timestamptz not null default now()
);
create index if not exists idx_lead_comments_lead on public.lead_comments(org_id, lead_id, "timestamp");

create table if not exists public.call_logs (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  lead_id         text not null,
  lead_name       text default '',
  called_by       text default 'Staff',
  notes           text default '',
  outcome         text not null,
  follow_up_date  timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_call_logs_lead on public.call_logs(org_id, lead_id, created_at desc);

create table if not exists public.sales_leads (
  id                   text primary key default gen_random_uuid()::text,
  org_id               uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  poc_name             text default '',
  poc_phone            text default '',
  poc_email            text default '',
  building_interested  text default '',
  progress             text default 'Inquire',
  deal_progress        text default '0-25%',
  listing_price        numeric default 0,
  quoted_price         numeric default 0,
  counter_offer        numeric default 0,
  offer_price          numeric default 0,
  notes                text default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_sales_leads_org on public.sales_leads(org_id, created_at desc);

create table if not exists public.contact_submissions (
  id            text primary key default gen_random_uuid()::text,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  name          text default '',
  email         text default '',
  company       text default '',
  phone         text default '',
  interest      text default '',
  city          text default '',
  message       text default '',
  ip_hash       text,
  session_id    text
);
create index if not exists idx_contact_submissions_org on public.contact_submissions(org_id, submitted_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Site builder / CMS (gated: Growth basic, Pro full)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  slug              text not null,
  title             text not null default '',
  meta_title        text default '',
  meta_description  text default '',
  excerpt           text default '',
  category          text default 'Insights',
  tags              text[] default '{}',
  read_time         integer default 5,
  content           text default '',
  status            text default 'draft' check (status in ('draft','published')),
  published_at      timestamptz default now(),
  author            text default '',
  author_title      text default '',
  image_url         text default '',
  image_alt         text default '',
  target_keyword    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  unique (org_id, slug)
);
create index if not exists idx_blog_posts_pub on public.blog_posts(org_id, status, published_at desc);

create table if not exists public.site_content (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  section     text not null,
  key         text not null,
  value       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, section, key)
);
create index if not exists idx_site_content_section on public.site_content(org_id, section);

create table if not exists public.site_settings (
  org_id      uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (org_id, key)
);

create table if not exists public.site_analytics (
  id            bigserial primary key,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  session_id    text not null,
  event_type    text not null,
  page_path     text not null default '/',
  page_title    text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  event_data    jsonb default '{}'::jsonb,
  duration_ms   integer default 0,
  device_type   text default 'desktop',
  screen_width  integer,
  created_at    timestamptz not null default now()
);
create index if not exists idx_site_analytics_session on public.site_analytics(session_id);
create index if not exists idx_site_analytics_event   on public.site_analytics(org_id, event_type, created_at desc);
create index if not exists idx_site_analytics_created on public.site_analytics(org_id, created_at desc);
create index if not exists idx_site_analytics_path    on public.site_analytics(org_id, page_path);

create or replace view public.session_summary
with (security_invoker = true) as
select
  org_id,
  session_id,
  min(created_at)                                                        as session_start,
  max(created_at)                                                        as session_end,
  count(*) filter (where event_type = 'page_view')                       as page_views,
  count(*) filter (where event_type = 'cta_click')                       as cta_clicks,
  count(*) filter (where event_type = 'property_click')                  as property_clicks,
  max((event_data->>'scroll_pct')::int)                                  as max_scroll_pct,
  array_agg(distinct page_path) filter (where event_type = 'page_view')  as pages_visited,
  (array_agg(referrer     order by created_at asc))[1]                   as entry_referrer,
  (array_agg(utm_source   order by created_at asc))[1]                   as utm_source,
  (array_agg(utm_medium   order by created_at asc))[1]                   as utm_medium,
  (array_agg(utm_campaign order by created_at asc))[1]                   as utm_campaign,
  (array_agg(device_type  order by created_at asc))[1]                   as device_type
from public.site_analytics
group by org_id, session_id;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Team / internal
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.allowed_users (
  id          text primary key default gen_random_uuid()::text,
  org_id      uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  email       text,
  name        text default '',
  role        text default 'admin',
  pin         text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists idx_allowed_users_role on public.allowed_users(org_id, role);
create index if not exists idx_allowed_users_pin  on public.allowed_users(pin) where pin is not null;

create table if not exists public.internal_conversations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  message       text not null,
  author_name   text,
  author_email  text default '',
  created_at    timestamptz not null default now()
);
create index if not exists idx_internal_conv_org on public.internal_conversations(org_id, created_at);

create table if not exists public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  actor_email    text not null default 'unknown',
  actor_name     text not null default 'Admin',
  action         text not null,
  resource_type  text not null,
  resource_name  text default '',
  resource_id    text default '',
  metadata       jsonb default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_activity_log_created  on public.activity_log(org_id, created_at desc);
create index if not exists idx_activity_log_resource on public.activity_log(org_id, resource_type, created_at desc);

create table if not exists public.todos (
  id           text primary key default gen_random_uuid()::text,
  org_id       uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  task         text not null default '',
  description  text default '',
  assigned_to  text,
  due_date     text,                 -- UI sends '' when empty, so TEXT (not DATE)
  status       text default 'todo',
  priority     text default 'medium',
  is_private   boolean default false,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);
create index if not exists idx_todos_org on public.todos(org_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Properties & portfolio
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id           text primary key default gen_random_uuid()::text,
  org_id       uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  name         text not null,
  type         text not null,
  address      text,
  city         text not null default '',
  sqft         text,
  lease_status text default 'available',
  badge        text,
  badge_color  text default '#6366F1',
  description  text,
  features     jsonb default '[]'::jsonb,
  images       jsonb default '[]'::jsonb,
  hero_image   text,
  in_banner    boolean default false,
  published    boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_properties_pub on public.properties(org_id, published, created_at desc);

create table if not exists public.property_details (
  org_id                uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  property_id           text not null,
  total_units           integer default 0,
  taxes_annual          numeric(10,2) default 0,
  taxes_county_annual   numeric(10,2) default 0,
  taxes_city_annual     numeric(10,2) default 0,
  insurance_annual      numeric(10,2) default 0,
  fire_security_annual  numeric(10,2) default 0,
  gas_annual            numeric(10,2) default 0,
  internet_annual       numeric(10,2) default 0,
  electric_annual       numeric(10,2) default 0,
  water_annual          numeric(10,2) default 0,
  trash_annual          numeric(10,2) default 0,
  electric_monthly      numeric(10,2) default 0,
  water_monthly         numeric(10,2) default 0,
  other_monthly         numeric(10,2) default 0,
  trend                 text default 'stable',
  notes                 text default '',
  display_name          text,
  updated_at            timestamptz not null default now(),
  primary key (org_id, property_id)
);

create table if not exists public.property_image_overrides (
  org_id       uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  property_id  text not null,
  image_url    text,
  hero_url     text,
  all_urls     jsonb default '[]'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (org_id, property_id)
);

create table if not exists public.available_spaces (
  id            text primary key default gen_random_uuid()::text,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  property_id   text not null,
  name          text not null,
  monthly_rent  numeric(10,2) default 0,
  sqft          text default '',
  nnn_fee       numeric(10,2) default 0,
  nn_fee        numeric(10,2) default 0,
  utility_fee   numeric(10,2) default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_available_spaces_prop on public.available_spaces(org_id, property_id);

-- parking_lots: includes BOTH the API field names and the UI field names
-- (the existing UI/API mapping is mismatched — fixed in code later).
create table if not exists public.parking_lots (
  id                      text primary key default gen_random_uuid()::text,
  org_id                  uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  name                    text,
  address                 text,
  city                    text,
  county                  text,
  parent_property_id      text,
  associated_property_id  text,
  renewal_date            date,
  tax_city_annual         numeric default 0,
  tax_county_annual       numeric default 0,
  city_tax                numeric default 0,
  county_tax              numeric default 0,
  lease_price_paid        numeric default 0,
  price_paid              numeric default 0,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz default now()
);

create table if not exists public.portfolio_snapshots (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  snapshot_date   date not null,
  total_revenue   numeric(12,2) default 0,
  total_expenses  numeric(12,2) default 0,
  net_income      numeric(12,2) default 0,
  occupancy_rate  numeric(5,2) default 0,
  total_tenants   integer default 0,
  open_tickets    integer default 0,
  notes           text default '',
  created_at      timestamptz not null default now(),
  unique (org_id, snapshot_date)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Tenants & rent
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id                text primary key default gen_random_uuid()::text,
  org_id            uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  name              text not null default '',
  contact_name      text default '',
  email             text default '',
  phone             text default '',
  building          text default '',
  unit              text default '',
  rep               text default '',
  monthly_rent      numeric default 0,
  utilities_fee     numeric default 0,
  security_deposit  numeric default 0,
  nnn_fee           numeric default 0,
  cleaning_fee      numeric default 0,
  cam_fee           numeric default 0,
  nn_fee            numeric default 0,
  lease_start       date,
  lease_end         date,
  renewal_date      date,
  lease_alert_days  integer default 60,
  escalation_pct    numeric default 0,
  escalation_date   date,
  status            text default 'active',
  notes             text default '',
  source_lead_id    text default '',
  lease_documents   text default '[]',   -- JSON string; UI JSON.parse()s it (keep TEXT)
  sec_dep_received  boolean default false,
  sec_dep_date      date,
  sec_dep_status    text default 'no_change',
  sec_dep_notes     text default '',
  created_at        timestamptz not null default now()
);
create index if not exists idx_tenants_org on public.tenants(org_id, created_at desc);
create index if not exists idx_tenants_status on public.tenants(org_id, status);

create table if not exists public.rent_payments (
  id            text primary key default gen_random_uuid()::text,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  tenant_id     text not null,
  tenant_name   text not null default '',
  building      text default '',
  unit          text default '',
  month         text not null,           -- 'YYYY-MM'
  rent_due      numeric default 0,
  amount_paid   numeric default 0,
  paid          boolean default false,
  payment_type  text default '',
  payment_date  date,
  late_fee      numeric default 0,
  nn_fee        numeric default 0,
  nnn_fee       numeric default 0,
  utility_fee   numeric default 0,
  cleaning_fee  numeric default 0,
  cam_fee       numeric default 0,
  notes         text default '',
  is_submitted  boolean not null default false,
  submitted_at  timestamptz,
  submitted_by  text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, tenant_id, month)
);
create index if not exists idx_rent_payments_month on public.rent_payments(org_id, month);

create table if not exists public.subcontractor_contacts (
  id            text primary key default gen_random_uuid()::text,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  name          text not null default '',
  phone         text default '',
  service_type  text default 'Other',
  company       text default '',
  email         text default '',
  notes         text default '',
  rating        integer default 0,
  updated_by    text default 'Staff',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_subcontractors_type on public.subcontractor_contacts(org_id, service_type);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Operations
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.maintenance_tickets (
  id                 text primary key default gen_random_uuid()::text,
  org_id             uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  title              text not null default '',
  description        text default '',
  building           text default '',
  unit               text default '',
  tenant             text default '',
  category           text default 'Other',
  priority           integer default 3,
  status             text default 'open',
  assigned_to        text default '',
  reported_by        text default '',
  estimated_cost     numeric default 0,
  actual_cost        numeric default 0,
  estimated_hours    numeric default 0,
  scheduled_date     date,
  completed_date     date,
  notes              text default '',
  parts_needed       boolean default false,
  source             text default 'admin',
  billable           boolean default false,
  material_amount    numeric default 0,
  photo_url          text,
  completion_notes   text,
  actual_minutes     integer,
  first_response_at  timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists idx_maint_priority on public.maintenance_tickets(org_id, priority, created_at desc);
create index if not exists idx_maint_status   on public.maintenance_tickets(org_id, status);

create table if not exists public.cleaning_assignments (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  worker_name       text default '',
  property          text default '',
  area              text default '',
  scheduled_date    date not null default current_date,
  start_time        text,
  end_time          text,
  completed_at      timestamptz,
  notes             text default '',
  status            text default 'pending',
  photo_url         text,
  completion_notes  text,
  estimated_cost    numeric default 0,
  actual_cost       numeric default 0,
  created_at        timestamptz not null default now()
);
create index if not exists idx_cleaning_date   on public.cleaning_assignments(org_id, scheduled_date);
create index if not exists idx_cleaning_worker on public.cleaning_assignments(org_id, worker_name, scheduled_date);

create table if not exists public.filter_changes (
  id            text primary key default gen_random_uuid()::text,
  org_id        uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  property      text not null default '',
  last_changed  date,
  next_due      date,
  notes         text default '',
  updated_by    text default 'Staff',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, property)
);

create table if not exists public.building_inspections (
  id               text primary key default gen_random_uuid()::text,
  org_id           uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  property         text not null default '',
  inspection_type  text not null default '',
  inspection_date  date,
  crew_type        text default 'internal',
  notes            text default '',
  month            text,
  status           text default 'pending',
  is_submitted     boolean not null default false,
  submitted_at     timestamptz,
  submitted_by     text default '',
  updated_by       text default 'Staff',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_inspections_month on public.building_inspections(org_id, month, is_submitted);

create table if not exists public.building_inspection_config (
  org_id           uuid not null default public.default_org_id() references public.organizations(id) on delete cascade,
  id               text not null,          -- deterministic: cfg_<property>_<type>
  property         text not null,
  inspection_type  text not null,
  enabled          boolean default true,
  created_at       timestamptz not null default now(),
  primary key (org_id, id),
  unique (org_id, property, inspection_type)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. updated_at triggers (every table that has an updated_at column)
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_name = c.table_name and tb.table_schema = c.table_schema
    where c.table_schema = 'public' and c.column_name = 'updated_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Row Level Security
--    • service_role (API routes) bypasses RLS.
--    • authenticated users: full access to rows of orgs they're a member of.
--    • anon: read-only on published public-site content.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;

drop policy if exists org_member_read on public.organizations;
create policy org_member_read on public.organizations
  for select to authenticated
  using (id in (select public.current_user_org_ids()));

drop policy if exists membership_self_read on public.memberships;
create policy membership_self_read on public.memberships
  for select to authenticated
  using (user_id = auth.uid());

do $$
declare
  t text;
  tables text[] := array[
    'leads','lead_comments','call_logs','sales_leads','contact_submissions',
    'blog_posts','site_content','site_settings','site_analytics',
    'internal_conversations','activity_log','todos',
    'properties','property_details','property_image_overrides','available_spaces',
    'parking_lots','portfolio_snapshots','tenants','rent_payments','subcontractor_contacts',
    'maintenance_tickets','cleaning_assignments','filter_changes',
    'building_inspections','building_inspection_config'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists org_member_all on public.%I', t);
    execute format(
      'create policy org_member_all on public.%I for all to authenticated
         using (org_id in (select public.current_user_org_ids()))
         with check (org_id in (select public.current_user_org_ids()))', t);
  end loop;
end $$;

-- Public-site reads (anon). Phase 3 scopes these per org/domain.
drop policy if exists anon_read_published on public.properties;
create policy anon_read_published on public.properties
  for select to anon using (published = true);

drop policy if exists anon_read_published on public.blog_posts;
create policy anon_read_published on public.blog_posts
  for select to anon using (status = 'published');

drop policy if exists anon_read on public.site_content;
create policy anon_read on public.site_content for select to anon using (true);

drop policy if exists anon_read on public.site_settings;
create policy anon_read on public.site_settings for select to anon using (true);

drop policy if exists anon_read on public.property_image_overrides;
create policy anon_read on public.property_image_overrides for select to anon using (true);

-- allowed_users: the admin page checks the signed-in user's OWN row from the
-- browser. Allow reading only your own row, and never expose the PIN column.
alter table public.allowed_users enable row level security;
drop policy if exists self_read on public.allowed_users;
create policy self_read on public.allowed_users
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

revoke select on public.allowed_users from anon, authenticated;
grant  select (id, org_id, email, name, role, active, created_at)
  on public.allowed_users to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. Storage buckets (all public-read; writes go through service role)
-- ───────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('property-images',    'property-images',    true, null),
  ('blog-images',        'blog-images',        true, 5242880),
  ('tenant-assets',      'tenant-assets',      true, null),
  ('maintenance-photos', 'maintenance-photos', true, null),
  ('crew-photos',        'crew-photos',        true, null)
on conflict (id) do update set public = excluded.public;

commit;

-- Sanity check: should list 29 tables (27 app + organizations + memberships), all RLS-enabled
select tablename, rowsecurity as rls_enabled
from pg_tables where schemaname = 'public'
order by tablename;
