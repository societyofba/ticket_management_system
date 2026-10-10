-- ============================================================
-- CBA Forum – Migration 006: Event Day Check-In Tracking
-- Run in Supabase SQL Editor (Dashboard => SQL Editor => New Query)
-- ============================================================

-- 1. Add check-in tracking columns to buyers table
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS checked_in       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checked_in_at    TIMESTAMPTZ;

-- Index for fast check-in queries (only checked-in attendees)
CREATE INDEX IF NOT EXISTS buyers_checked_in_idx ON public.buyers (checked_in_at DESC)
  WHERE checked_in = TRUE;

-- 2. Grants (ensure all roles can update check-in status)
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
