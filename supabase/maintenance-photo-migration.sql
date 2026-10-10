-- Add photo_url column to maintenance_tickets for ticket photo attachments
ALTER TABLE maintenance_tickets ADD COLUMN IF NOT EXISTS photo_url TEXT;
