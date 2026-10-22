-- ============================================================
-- CBA Forum – Migration 009: Ticket Confirmation SMS Tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add ticket SMS tracking columns to buyers table
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS ticket_sms_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (ticket_sms_status IN ('not_sent', 'sending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS ticket_sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ticket_sms_error TEXT;

-- 2. Seed default ticket SMS template in settings table
INSERT INTO public.settings (key, value) VALUES
  ('ticket_sms_template', 'CBA Forum 2026 - Ticket Confirmed! Ticket: {{ticket_number}} | Ref: {{payment_ref}}. Name: {{name}}, Org: {{company}} ({{designation}}), Email: {{email}}, Mobile: {{mobile}}, Paid: {{ticket_price}}. Your ticket with the QR code has been sent to the email address above. Please check your inbox (if not in inbox, check spam). Inquiries: info@cbaforum.lk')
ON CONFLICT (key) DO NOTHING;

-- 3. Grant permissions for all roles
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.settings TO anon, authenticated, service_role;
