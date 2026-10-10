-- Add monthly tracking columns to building_inspections
ALTER TABLE building_inspections ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE building_inspections ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE building_inspections ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE building_inspections ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT '';
ALTER TABLE building_inspections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_building_inspections_month ON building_inspections(month);

-- Config table for which inspection types apply to each building
CREATE TABLE IF NOT EXISTS building_inspection_config (
  id TEXT PRIMARY KEY,
  property TEXT NOT NULL,
  inspection_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property, inspection_type)
);
