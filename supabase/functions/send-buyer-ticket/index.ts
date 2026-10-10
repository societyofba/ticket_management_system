// Supabase Edge Function: send-buyer-ticket
// Issues and emails official E-Tickets with QR code to confirmed participants

import nodemailer from 'npm:nodemailer@6.9.13'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SMTP_HOST       = Deno.env.get('SMTP_HOST')       || 'smtp.gmail.com'
    const SMTP_PORT       = parseInt(Deno.env.get('SMTP_PORT') || '465')
    const SMTP_USER       = Deno.env.get('SMTP_USER')
    const SMTP_PASSWORD   = Deno.env.get('SMTP_PASSWORD')
    const SMTP_FROM_NAME  = Deno.env.get('SMTP_FROM_NAME')  || 'CBA Forum'
    const SMTP_FROM_EMAIL = Deno.env.get('SMTP_FROM_EMAIL') || SMTP_USER

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
    const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY')
      || req.headers.get('apikey')
      || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dmltcGt6YmJ3cGRndG9ucGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTAzNDAsImV4cCI6MjEwNzAyNjM0MH0.wO-ueoNKec--iQF2FZzDbhBSheo3TcTyUEVKetmwLqQ'

    if (!SMTP_USER || !SMTP_PASSWORD) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASSWORD in Supabase Secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const buyer_id = body.buyer_id
    let buyer = body.buyer

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    })

    if (!buyer && buyer_id) {
      const { data, error: buyerErr } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', buyer_id)
        .maybeSingle()

      if (buyerErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Database error finding buyer: ${buyerErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      buyer = data
    }

    if (!buyer || !buyer.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found or buyer has no email address.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetId = buyer_id || buyer.id

    // Ensure buyer has a unique ticket number
    let ticketNumber = buyer.ticket_number
    if (!ticketNumber) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const shortId = (targetId || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
      ticketNumber = `CBA-2026-${shortId || randomSuffix}`
    }

    // Mark as sending ticket email
    if (targetId) {
      await supabase.from('buyers').update({
        ticket_number: ticketNumber,
        ticket_email_status: 'sending',
      }).eq('id', targetId)
    }

    // Fetch settings from DB
    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const s: Record<string, string> = {
      event_name: 'CBA Forum 2026',
      event_location: 'Waters Edge Hotel',
      event_time: '3:00 PM – 7:00 PM',
      ticket_price: 'LKR 3,000',
      ticket_email_subject: 'Your Official E-Ticket – CBA Forum 2026',
    }
    for (const row of settingsRows ?? []) {
      if (row.value) s[row.key] = row.value
    }

    // Generate QR Code image URL (Universal public HTTPS QR service, rendered natively by Gmail & all clients)
    const qrPayload = `TICKET:${ticketNumber}|NAME:${buyer.name}|EVENT:${s.event_name}|TIME:${s.event_time}|VENUE:${s.event_location}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}&margin=10`

    const mealLabel = buyer.meal_preference === 'vegetarian'
      ? 'Vegetarian'
      : buyer.meal_preference === 'non_vegetarian'
      ? 'Non-Vegetarian'
      : buyer.meal_preference || 'Standard'

    // Replace placeholders
    const fill = (text: string) =>
      text
        .replace(/{{name}}/g,            buyer.name || 'Participant')
        .replace(/{{email}}/g,           buyer.email || '')
        .replace(/{{mobile}}/g,          buyer.mobile || '')
        .replace(/{{company}}/g,         buyer.company || 'N/A')
        .replace(/{{designation}}/g,     buyer.designation || 'Participant')
        .replace(/{{meal_preference}}/g, mealLabel)
        .replace(/{{ticket_number}}/g,   ticketNumber)
        .replace(/{{payment_ref}}/g,     buyer.payment_ref || 'PayHere Online')
        .replace(/{{qr_code_url}}/g,     qrCodeUrl)
        .replace(/{{event_name}}/g,      s.event_name)
        .replace(/{{event_location}}/g,  s.event_location)
        .replace(/{{event_time}}/g,      s.event_time)
        .replace(/{{ticket_price}}/g,    s.ticket_price)

    const subject = fill(s.ticket_email_subject || 'Your Official E-Ticket – CBA Forum 2026')

    const rawTemplate = s.ticket_email_template || `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:32px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">{{event_name}}</h1>
          <p style="margin:8px 0 0;color:#94a3b8;">📍 {{event_location}} &bull; 🕒 {{event_time}}</p>
        </div>
        <div style="padding:28px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:20px;text-align:center;color:#15803d;font-weight:bold;">
            🎉 Payment Confirmed &bull; Ticket: {{ticket_number}}
          </div>
          <p>Dear <strong>{{name}}</strong>,</p>
          <p>Thank you for your payment. Here is your official entry pass:</p>
          <div style="border:2px dashed #cbd5e1;padding:20px;border-radius:12px;background:#f8fafc;margin:16px 0;text-align:center;">
            <p style="margin:0 0 10px;font-size:18px;font-weight:bold;color:#1e3a8a;font-family:monospace;">{{ticket_number}}</p>
            <p style="margin:4px 0;color:#475569;"><strong>Attendee:</strong> {{name}} ({{company}} &bull; {{designation}})</p>
            <p style="margin:4px 0;color:#475569;"><strong>Meal Preference:</strong> {{meal_preference}}</p>
            <div style="margin:16px 0;">
              <img src="{{qr_code_url}}" alt="QR Code" width="180" height="180" style="border:1px solid #cbd5e1;padding:8px;background:#fff;border-radius:8px;" />
            </div>
            <p style="font-size:12px;color:#64748b;margin:0;">Present this QR code at Waters Edge Hotel entrance</p>
          </div>
        </div>
      </div>
    `
    const htmlBody = fill(rawTemplate)

    const plainText = `
OFFICIAL E-TICKET: ${s.event_name}
Ticket Number: ${ticketNumber}
Status: CONFIRMED & PAID (${s.ticket_price})

Attendee Details:
- Name: ${buyer.name}
- Company: ${buyer.company}
- Designation: ${buyer.designation}
- Mobile: ${buyer.mobile}
- Email: ${buyer.email}
- Meal Choice: ${mealLabel}

Event Details:
- Venue: ${s.event_location}
- Time: ${s.event_time}

QR Code Pass:
${qrCodeUrl}

Please present this ticket on your smartphone at the entrance desk at ${s.event_location}.

CBA Forum Organizing Committee
`.trim()

    const cleanPassword = SMTP_PASSWORD.trim().replace(/\s+/g, '')

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.trim(),
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER.trim(),
        pass: cleanPassword,
      },
    })

    const fromName     = (s.email_from_name || SMTP_FROM_NAME || 'CBA Forum').trim()
    const fromEmail    = (SMTP_FROM_EMAIL || SMTP_USER).trim()
    const replyToEmail = (s.email_from_address || fromEmail).trim()

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: replyToEmail,
      to: buyer.email.trim(),
      subject: subject,
      text: plainText,
      html: htmlBody,
    })

    // Mark as sent in DB
    if (targetId) {
      await supabase.from('buyers').update({
        ticket_number: ticketNumber,
        ticket_email_status: 'sent',
        ticket_email_sent_at: new Date().toISOString(),
        ticket_email_error: null,
      }).eq('id', targetId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket_number: ticketNumber,
        message: `Official ticket emailed to ${buyer.email}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Send ticket error:', message)

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
      const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
      if (SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
        const body = await req.clone().json().catch(() => ({}))
        const targetId = body.buyer_id || body.buyer?.id
        if (targetId) {
          await supabase.from('buyers').update({
            ticket_email_status: 'failed',
            ticket_email_error: message,
            ticket_email_sent_at: new Date().toISOString(),
          }).eq('id', targetId)
        }
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
