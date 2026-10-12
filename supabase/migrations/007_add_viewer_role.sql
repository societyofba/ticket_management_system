-- ============================================================
-- CBA Forum – Migration 007: Add 'viewer' (Read-Only) Admin Role
-- Run in Supabase SQL Editor (Dashboard => SQL Editor => New Query)
-- ============================================================

-- 1. Drop existing role constraint and allow 'viewer'
ALTER TABLE public.admins
  DROP CONSTRAINT IF EXISTS admins_role_check;

ALTER TABLE public.admins
  ADD CONSTRAINT admins_role_check
  CHECK (role IN ('super_admin', 'admin', 'viewer'));

-- 2. Seed Default Viewer Account
-- Viewer: Read-only access to observe stats, buyers, payments, and check-ins
INSERT INTO public.admins (email, password, name, role)
VALUES
  ('viewer@cbaforum.lk', 'viewer123', 'Viewer / Observer', 'viewer')
ON CONFLICT (email) DO UPDATE
  SET role = EXCLUDED.role,
      name = EXCLUDED.name;
