-- Migration: Create rent_payments table for monthly rent tracking
-- Each row = one tenant's payment record for one month

CREATE TABLE IF NOT EXISTS rent_payments (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  tenant_name   TEXT NOT NULL DEFAULT '',
  building      TEXT DEFAULT '',
  unit          TEXT DEFAULT '',
  month         TEXT NOT NULL,            -- "2025-06" format (YYYY-MM)
  rent_due      NUMERIC DEFAULT 0,        -- auto-populated from tenant card
  amount_paid   NUMERIC DEFAULT 0,        -- actual payment received
  paid          BOOLEAN DEFAULT FALSE,
  payment_type  TEXT DEFAULT '',           -- "ACH", "Cash", "Check"
  payment_date  DATE,                     -- when payment was received
  late_fee      NUMERIC DEFAULT 0,
  notes         TEXT DEFAULT '',
  is_submitted  BOOLEAN DEFAULT FALSE,    -- draft until month is submitted
  submitted_at  TIMESTAMPTZ,
  submitted_by  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups by month
CREATE INDEX IF NOT EXISTS idx_rent_payments_month ON rent_payments(month);

-- Prevent duplicate entries for same tenant + month
CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_payments_tenant_month ON rent_payments(tenant_id, month);

-- Enable Row-Level Security (open for service-role key usage)
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON rent_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);
