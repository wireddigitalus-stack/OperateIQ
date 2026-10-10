-- Migration: Phase 4 Database Schema Updates
-- Add SLA response/completion tracking to maintenance_tickets
-- Add budgeting fields to cleaning_assignments
--
-- Run this in the Supabase SQL Editor.

-- 1. Add SLA tracking columns to maintenance_tickets
ALTER TABLE maintenance_tickets 
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add budgeting fields to cleaning_assignments
ALTER TABLE cleaning_assignments
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost NUMERIC DEFAULT 0;
