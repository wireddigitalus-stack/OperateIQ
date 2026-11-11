-- ============================================================================
-- PropOpsIQ Migration 005: Phase 3 Landlord Core (Units Roster & Expense Ledger)
-- Safe to run multiple times (IF NOT EXISTS).
-- Note: API routes include automatic fallback storage if this migration has not
-- been applied yet, and seamlessly switch to these tables once present.
-- ============================================================================

-- 1. Property Units Inventory (property -> units with beds, baths, sqft, rent, status)
CREATE TABLE IF NOT EXISTS public.property_units (
  id           TEXT PRIMARY KEY,
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id  TEXT NOT NULL,
  building     TEXT NOT NULL,
  unit_number  TEXT NOT NULL,
  beds         NUMERIC(4,1) NOT NULL DEFAULT 1,
  baths        NUMERIC(4,1) NOT NULL DEFAULT 1,
  sqft         INTEGER NOT NULL DEFAULT 0,
  market_rent  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'vacant', -- occupied | vacant | turnover | notice
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_units_org_building
  ON public.property_units (org_id, building);

ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_units_org_isolation" ON public.property_units;
CREATE POLICY "property_units_org_isolation" ON public.property_units
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND active = TRUE
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND active = TRUE
    )
  );

-- 2. Expense Ledger & IRS Schedule E Tracking
CREATE TABLE IF NOT EXISTS public.expenses (
  id                TEXT PRIMARY KEY,
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  building          TEXT NOT NULL DEFAULT '',
  unit              TEXT NOT NULL DEFAULT '',
  vendor            TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT 'Repairs',
  schedule_e_line   TEXT NOT NULL DEFAULT 'Line 14',
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method    TEXT NOT NULL DEFAULT 'Card',
  tax_deductible    BOOLEAN NOT NULL DEFAULT TRUE,
  receipt_url       TEXT,
  source_ticket_id  TEXT,
  notes             TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_org_date
  ON public.expenses (org_id, expense_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_org_source_ticket
  ON public.expenses (org_id, source_ticket_id)
  WHERE source_ticket_id IS NOT NULL AND source_ticket_id <> '';

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_org_isolation" ON public.expenses;
CREATE POLICY "expenses_org_isolation" ON public.expenses
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND active = TRUE
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND active = TRUE
    )
  );
