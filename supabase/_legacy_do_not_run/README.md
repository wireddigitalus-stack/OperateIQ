# Legacy SQL — DO NOT RUN

These are the original single-tenant migrations inherited from the cloned codebase.
They are kept for reference only and are fully superseded by
`supabase/operateiq/001_base_schema.sql` (multi-tenant, org_id on every table).

Running them against the OperateIQ database would create conflicting
constraints and an RLS policy set that breaks tenant isolation.
