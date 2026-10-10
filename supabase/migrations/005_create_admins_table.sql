-- ============================================================
-- CBA Forum – Migration 005: Admin Users & Role-Based Access
-- Run in Supabase SQL Editor (Dashboard => SQL Editor => New Query)
-- ============================================================

-- 1. Create Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  email       TEXT          NOT NULL UNIQUE,
  password    TEXT          NOT NULL,
  role        TEXT          NOT NULL CHECK (role IN ('super_admin', 'admin')),
  avatar      TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for login lookup
CREATE INDEX IF NOT EXISTS admins_email_idx ON public.admins (email);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow access for admin management
CREATE POLICY "Allow all admin queries"
  ON public.admins
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Explicitly grant permissions
GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;

-- 2. Seed Default Admins
-- Super Admin: Full system access (delete buyers + change settings)
-- Admin: Operational access (all except delete buyers and change settings)
INSERT INTO public.admins (email, password, name, role)
VALUES
  ('superadmin@cbaforum.lk', 'super123', 'Super Admin', 'super_admin'),
  ('admin@cbaforum.lk',      'admin123', 'Event Admin', 'admin')
ON CONFLICT (email) DO UPDATE
  SET role = EXCLUDED.role,
      name = EXCLUDED.name;
