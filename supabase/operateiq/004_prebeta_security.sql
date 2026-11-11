-- ═══════════════════════════════════════════════════════════════════════════
-- PropOpsIQ 004 — Pre-beta security hardening
--
-- 1. Durable rate limiting (works across Vercel serverless instances):
--    table public.rate_limits + function public.rate_limit_hit().
-- 2. Staff PINs are unique PER ORGANIZATION (crew log in with company code + PIN),
--    enforced by a partial unique index. Replaces the non-unique global index.
-- 3. Row Level Security: signed-in members get READ-ONLY direct access to their
--    own org's rows. All writes go through the server (service role), which
--    enforces roles, plan limits and audit logging.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Durable rate limiting ──────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key           text primary key,
  count         integer     not null default 0,
  window_start  timestamptz not null default now()
);
alter table public.rate_limits enable row level security;  -- no policies: service role only
revoke all on public.rate_limits from anon, authenticated;

-- Returns TRUE when the call is allowed, FALSE when the limit is exceeded.
-- Atomic: a single upsert per call, so concurrent requests can't race past the limit.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
                  when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else rl.count + 1
                end,
        window_start = case
                  when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
                  else rl.window_start
                end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;

-- Housekeeping helper (optional: call from a cron) — drops windows older than a day.
create or replace function public.rate_limits_prune()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function public.rate_limits_prune() from public, anon, authenticated;

-- 2. Staff PINs unique per org ─────────────────────────────────────────────
drop index if exists public.idx_allowed_users_pin;
create unique index if not exists uq_allowed_users_org_pin_active
  on public.allowed_users (org_id, pin)
  where pin is not null and active = true;

-- 3. Read-only RLS for signed-in members ───────────────────────────────────
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
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists org_member_all on public.%I', t);
      execute format('drop policy if exists org_member_read on public.%I', t);
      execute format(
        'create policy org_member_read on public.%I for select to authenticated
           using (org_id in (select public.current_user_org_ids()))', t);
      execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

commit;

-- Verification ─────────────────────────────────────────────────────────────
select 'rate_limit_hit' as check, public.rate_limit_hit('migration-004-selftest', 5, 60) as ok;
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and policyname in ('org_member_all', 'org_member_read')
order by tablename;
