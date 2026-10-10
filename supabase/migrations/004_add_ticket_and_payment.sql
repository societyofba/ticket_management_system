-- ============================================================
-- CBA Forum – Migration 004: Payment Confirmation & E-Ticket
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add payment and ticket columns to buyers table
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS payment_status        TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_ref           TEXT,
  ADD COLUMN IF NOT EXISTS ticket_number         TEXT,
  ADD COLUMN IF NOT EXISTS ticket_email_status   TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (ticket_email_status IN ('not_sent', 'sending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS ticket_email_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ticket_email_error    TEXT;

-- Create index for ticket numbers
CREATE UNIQUE INDEX IF NOT EXISTS buyers_ticket_number_idx ON public.buyers (ticket_number) WHERE ticket_number IS NOT NULL;

-- 2. Seed default ticket email template and settings
INSERT INTO public.settings (key, value) VALUES
  ('ticket_email_subject', 'Your Official E-Ticket – CBA Forum 2026'),
  ('ticket_terms', 'Please present this digital e-ticket on your smartphone or bring a printed copy to the registration desk at Waters Edge Hotel.'),
  ('ticket_email_template', '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:36px 32px;text-align:center;color:#ffffff;">
    <div style="display:inline-block;background:rgba(59,130,246,0.2);border:1px solid rgba(147,197,253,0.3);color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:12px;">Official Event Pass</div>
    <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">{{event_name}}</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">📍 {{event_location}} &bull; 🕒 {{event_time}}</p>
  </div>

  <!-- Ticket Body -->
  <div style="padding:32px;">
    <!-- Confirmation Banner -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:24px;text-align:center;">
      <span style="color:#15803d;font-weight:700;font-size:14px;">🎉 Payment Confirmed &bull; Ticket Issued</span>
    </div>

    <!-- Ticket Card -->
    <div style="border:2px dashed #cbd5e1;border-radius:12px;padding:24px;background:#f8fafc;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:18px;">
        <div>
          <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Ticket Number</span>
          <div style="font-size:18px;font-weight:800;color:#1e293b;font-family:monospace;letter-spacing:1px;">{{ticket_number}}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Status</span>
          <div style="font-size:13px;font-weight:700;color:#16a34a;">PAID ({{ticket_price}})</div>
        </div>
      </div>

      <!-- Attendee Information -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:35%;"><strong>Attendee Name:</strong></td>
          <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:700;">{{name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Company:</strong></td>
          <td style="padding:6px 0;color:#334155;font-size:13.5px;">{{company}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Designation:</strong></td>
          <td style="padding:6px 0;color:#334155;font-size:13.5px;">{{designation}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Mobile:</strong></td>
          <td style="padding:6px 0;color:#334155;font-size:13.5px;">{{mobile}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Email:</strong></td>
          <td style="padding:6px 0;color:#334155;font-size:13.5px;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Meal Choice:</strong></td>
          <td style="padding:6px 0;color:#334155;font-size:13.5px;">{{meal_preference}}</td>
        </tr>
      </table>

      <!-- QR Code Section -->
      <div style="text-align:center;padding:16px 0 8px;border-top:1px solid #e2e8f0;">
        <img src="{{qr_code_url}}" alt="Ticket QR Code" width="180" height="180" style="display:inline-block;border:1px solid #cbd5e1;padding:8px;background:#ffffff;border-radius:10px;" />
        <p style="margin:8px 0 0;font-size:11.5px;color:#64748b;">Scan at the entrance desk for rapid check-in</p>
      </div>
    </div>

    <!-- Instructions -->
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:8px;font-size:12.5px;color:#1e40af;line-height:1.6;">
      <strong>Check-In Instructions:</strong><br/>
      Please present this digital pass on your phone or bring a printout to the registration desk at Waters Edge Hotel upon arrival.
    </div>

    <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">
      CBA Forum Organizing Committee &bull; Waters Edge Hotel, Battaramulla
    </div>
  </div>
</div>')
ON CONFLICT (key) DO NOTHING;

-- Permissions
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.settings TO anon, authenticated, service_role;
