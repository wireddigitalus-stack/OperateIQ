-- Add progress column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT '0-25%';
