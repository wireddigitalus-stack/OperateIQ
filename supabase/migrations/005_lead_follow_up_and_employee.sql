-- Add follow-up date and creator employee columns to the leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATE DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_employee TEXT DEFAULT 'Staff';
