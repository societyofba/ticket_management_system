-- ============================================================
-- CBA Forum – Migration 003: SMS Tracking & SMSlenz Settings
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add SMS tracking columns to buyers table
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS sms_status  TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (sms_status IN ('not_sent', 'sending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_error   TEXT;

-- 2. Seed default SMS settings in settings table
INSERT INTO public.settings (key, value) VALUES
  ('sms_sender_id', 'CBAFORUM'),
  ('sms_template', 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}} on {{event_time}}. Ticket: {{ticket_price}}. Complete payment & book: {{payment_link}}'),
  ('sms_auto_send', 'true')
ON CONFLICT (key) DO NOTHING;

-- 3. Ensure permissions for all roles
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.settings TO anon, authenticated, service_role;
