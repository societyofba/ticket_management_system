-- ============================================================
-- CBA Forum – Migration 002: Email Tracking + Settings
-- Run in Supabase SQL Editor after 001
-- ============================================================

-- 1. Add email tracking columns to buyers
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS email_status  TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (email_status IN ('not_sent', 'sending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_error   TEXT;

-- 2. Settings table (key-value store for template, event info, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now"
  ON public.settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.settings TO anon;
GRANT ALL ON public.settings TO authenticated;

-- 3. Seed default settings
INSERT INTO public.settings (key, value) VALUES
  ('event_name',       'CBA Forum 2026'),
  ('event_location',   'Waters Edge Hotel'),
  ('event_time',       '3:00 PM – 7:00 PM'),
  ('ticket_price',     'LKR 3,000'),
  ('payment_link',     'https://pay.cbaforum.lk'),
  ('email_from_name',  'CBA Forum'),
  ('email_from_address','noreply@cbaforum.lk'),
  ('email_subject',    'You Are Invited – CBA Forum 2026'),
  ('email_body',       '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#1a2550,#3b82f6);padding:36px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:26px;letter-spacing:-0.5px;">{{event_name}}</h1>
    <p style="color:rgba(255,255,255,0.75);margin:10px 0 0;font-size:15px;">You''re Invited!</p>
  </div>
  <div style="background:white;padding:36px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <p style="font-size:16px;color:#1a1f35;">Dear <strong>{{name}}</strong>,</p>
    <p style="color:#4b5a8a;line-height:1.7;">
      Congratulations! You are eligible to participate in <strong>{{event_name}}</strong> —
      Sri Lanka''s premier business analytics event.
    </p>
    <div style="background:#f0f4ff;border-left:4px solid #3b82f6;padding:18px 22px;border-radius:8px;margin:24px 0;">
      <p style="margin:0 0 10px;color:#1a1f35;font-weight:700;font-size:15px;">Event Details</p>
      <p style="margin:5px 0;color:#4b5a8a;">📍 <strong>Location:</strong> {{event_location}}</p>
      <p style="margin:5px 0;color:#4b5a8a;">🕒 <strong>Time:</strong> {{event_time}}</p>
      <p style="margin:5px 0;color:#4b5a8a;">🎟️ <strong>Ticket Price:</strong> {{ticket_price}}</p>
    </div>
    <div style="background:#f8f9fa;padding:18px;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;color:#8892aa;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;">Your Details</p>
      <p style="margin:4px 0;color:#1a1f35;"><strong>Name:</strong> {{name}}</p>
      <p style="margin:4px 0;color:#1a1f35;"><strong>Email:</strong> {{email}}</p>
      <p style="margin:4px 0;color:#1a1f35;"><strong>Mobile:</strong> {{mobile}}</p>
    </div>
    <p style="color:#4b5a8a;line-height:1.7;">
      Please complete your payment and secure your seat today — seats are limited!
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="{{payment_link}}"
         style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;padding:14px 40px;
                border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
        Complete Payment Now →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #eceef5;margin:28px 0;"/>
    <p style="color:#8892aa;font-size:13px;text-align:center;margin:0;">
      Thank you,<br/>CBA Forum Organizing Committee
    </p>
  </div>
</div>')
ON CONFLICT (key) DO NOTHING;
