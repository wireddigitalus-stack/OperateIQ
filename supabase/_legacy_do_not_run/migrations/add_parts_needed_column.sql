-- Migration: Add parts_needed boolean column to maintenance_tickets
-- Replaces the [PARTS NEEDED] string-prefix hack in the notes column
-- with a proper boolean flag for better querying and data integrity.
--
-- Run this in the Supabase SQL Editor.

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS parts_needed BOOLEAN DEFAULT false;

-- Backfill: migrate any existing [PARTS NEEDED] prefixed notes
UPDATE maintenance_tickets
  SET parts_needed = true,
      notes = TRIM(REPLACE(notes, '[PARTS NEEDED]', ''))
  WHERE notes LIKE '%[PARTS NEEDED]%';
