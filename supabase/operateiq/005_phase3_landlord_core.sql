-- ═══════════════════════════════════════════════════════════════════════════
-- PropOpsIQ 005 — Phase 3 Landlord Core (Unit Roster & Schedule E Expenses)
--
-- 1. public.property_units — per-building unit roster (beds, baths, sqft,
--    market rent, live vacancy/turnover status).
-- 2. public.expenses — itemized landlord expense ledger mapped to IRS
--    Schedule E (Part I, Lines 5–19) with private receipt vault metadata
--    and idempotent maintenance-ticket cost import index.
-- 3. RLS matches 001 + 004: read-only org-isolated access for signed-in
--    members via public.current_user_org_ids() (backed by public.memberships);
--    all writes go through authenticated Next.js server routes (service role).
--
-- Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Ensure helper from 001_base_schema.sql exists (reads public.memberships)
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

-- 1. Property Units Inventory ────────────────────────────────────────────────
create table if not exists public.property_units (
  id           text primary key,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  property_id  text not null default '',
  building     text not null,
  unit_number  text not null,
  beds         numeric(4,1) not null default 0,
  baths        numeric(4,1) not null default 0,
  sqft         integer not null default 0,
  market_rent  numeric(12,2) not null default 0,
  status       text not null default 'vacant'
                 check (status in ('occupied', 'vacant', 'turnover', 'notice')),
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, building, unit_number)
);

alter table public.property_units alter column property_id set default '';

create unique index if not exists uq_property_units_org_building_unit
  on public.property_units (org_id, building, unit_number);

create index if not exists idx_property_units_org_building
  on public.property_units (org_id, building);

alter table public.property_units enable row level security;

drop policy if exists "property_units_org_isolation" on public.property_units;
drop policy if exists org_member_all on public.property_units;
drop policy if exists org_member_read on public.property_units;

create policy org_member_read on public.property_units
  for select to authenticated
  using (org_id in (select public.current_user_org_ids()));

revoke insert, update, delete on public.property_units from anon, authenticated;

-- 2. Expense Ledger & IRS Schedule E Tracking ────────────────────────────────
create table if not exists public.expenses (
  id                text primary key,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  expense_date      date not null default current_date,
  building          text not null default 'Portfolio / General',
  unit              text not null default '',
  vendor            text not null default '',
  description       text not null default '',
  category          text not null default 'repairs',
  schedule_e_line   text not null default 'Line 14',
  amount            numeric(12,2) not null default 0,
  payment_method    text not null default 'Card',
  tax_deductible    boolean not null default true,
  receipt_url       text not null default '',
  receipt_name      text not null default '',
  source_ticket_id  text,
  notes             text not null default '',
  created_by        text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Ensure columns exist if an earlier partial run created the table
alter table public.expenses add column if not exists description text not null default '';
alter table public.expenses add column if not exists receipt_name text not null default '';
alter table public.expenses add column if not exists schedule_e_line text not null default 'Line 14';
alter table public.expenses add column if not exists notes text not null default '';

create index if not exists idx_expenses_org_date
  on public.expenses (org_id, expense_date desc);

create unique index if not exists idx_expenses_org_source_ticket
  on public.expenses (org_id, source_ticket_id)
  where source_ticket_id is not null and source_ticket_id <> '';

alter table public.expenses enable row level security;

drop policy if exists "expenses_org_isolation" on public.expenses;
drop policy if exists org_member_all on public.expenses;
drop policy if exists org_member_read on public.expenses;

create policy org_member_read on public.expenses
  for select to authenticated
  using (org_id in (select public.current_user_org_ids()));

revoke insert, update, delete on public.expenses from anon, authenticated;

commit;

-- Verification ───────────────────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('property_units', 'expenses')
order by tablename;
