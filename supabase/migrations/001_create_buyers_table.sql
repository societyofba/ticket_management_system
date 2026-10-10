-- ============================================================
-- CBA Forum Ticket Management System
-- Migration: 001_create_buyers_table.sql
-- ============================================================
-- Run this in your Supabase SQL Editor (Dashboard => SQL Editor => New Query)
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Buyers table
CREATE TABLE IF NOT EXISTS public.buyers (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT          NOT NULL CHECK (char_length(name) >= 2),
  email             TEXT          NOT NULL,
  mobile            TEXT          NOT NULL CHECK (char_length(mobile) >= 7),
  company           TEXT          NOT NULL CHECK (char_length(company) >= 1),
  designation       TEXT          NOT NULL CHECK (char_length(designation) >= 1),
  meal_preference   TEXT          NOT NULL DEFAULT 'non_vegetarian'
                      CHECK (meal_preference IN ('vegetarian', 'non_vegetarian', 'other')),
  meal_notes        TEXT,
  special_notes     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS buyers_email_idx    ON public.buyers (email);
CREATE INDEX IF NOT EXISTS buyers_company_idx  ON public.buyers (company);
CREATE INDEX IF NOT EXISTS buyers_created_idx  ON public.buyers (created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS buyers_updated_at ON public.buyers;
CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
-- TEMPORARY open policy for development.
-- Restrict to authenticated admins in Phase 1.
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now"
  ON public.buyers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Sample Data (remove before production)
-- ============================================================
INSERT INTO public.buyers (name, email, mobile, company, designation, meal_preference, special_notes)
VALUES
  ('Kamal Perera',     'kamal.perera@acme.lk',     '+94771234567', 'Acme Holdings Ltd.',        'Chief Financial Officer',   'non_vegetarian', NULL),
  ('Nirosha Silva',    'nirosha.silva@techco.lk',   '+94712345678', 'TechCo Solutions Pvt Ltd.', 'Head of Analytics',         'vegetarian',     'Requires vegan option if possible'),
  ('Ruwan Fernando',   'ruwan.f@globalbank.lk',     '+94723456789', 'Global Bank PLC',           'Senior Business Analyst',   'non_vegetarian', NULL),
  ('Amali Jayawardena','amali.j@ceyloninvest.lk',   '+94764567890', 'Ceylon Investments Ltd.',   'Director - Strategy',       'vegetarian',     NULL),
  ('Thilak Bandara',   'thilak.b@sltelcom.lk',      '+94785678901', 'SL Telecom Ltd.',           'General Manager - IT',      'other',          'Diabetic - low sugar meals')
ON CONFLICT DO NOTHING;
