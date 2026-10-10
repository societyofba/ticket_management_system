// Supabase Edge Function: send-buyer-email
// Uses Nodemailer via npm:nodemailer (standard, reliable, no deprecated APIs)

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
          error: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASSWORD in Supabase Secrets.' 
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
          JSON.stringify({ success: false, error: `Database error: ${buyerErr.message}` }),
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
    if (targetId) {
      await supabase.from('buyers').update({ email_status: 'sending' }).eq('id', targetId)
    }

    // Fetch settings from DB
    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const s: Record<string, string> = {
      event_name: 'CBA Forum 2026',
      event_location: 'Waters Edge Hotel',
      event_time: '3:00 PM – 7:00 PM',
      ticket_price: 'LKR 3,000',
      payment_link: 'https://pay.cbaforum.lk',
      email_subject: 'You Are Invited – CBA Forum 2026',
    }
    for (const row of settingsRows ?? []) {
      if (row.value) s[row.key] = row.value
    }

    const fill = (text: string) =>
      text
        .replace(/{{name}}/g,           buyer.name || 'Participant')
        .replace(/{{email}}/g,          buyer.email || '')
        .replace(/{{mobile}}/g,         buyer.mobile || '')
        .replace(/{{event_name}}/g,     s.event_name)
        .replace(/{{event_location}}/g, s.event_location)
        .replace(/{{event_time}}/g,     s.event_time)
        .replace(/{{ticket_price}}/g,   s.ticket_price)
        .replace(/{{payment_link}}/g,   s.payment_link)

    const subject = fill(s.email_subject)
    const rawBody = s.email_body || `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e3a8a;">{{event_name}}</h2>
        <p>Dear <strong>{{name}}</strong>,</p>
        <p>You are eligible to participate in <strong>{{event_name}}</strong>.</p>
        <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;">📍 <strong>Location:</strong> {{event_location}}</p>
          <p style="margin:4px 0;">🕒 <strong>Time:</strong> {{event_time}}</p>
          <p style="margin:4px 0;">🎟️ <strong>Ticket Price:</strong> {{ticket_price}}</p>
        </div>
        <p><strong>Your Details:</strong></p>
        <p>Name: {{name}}<br/>Mobile: {{mobile}}<br/>Email: {{email}}</p>
        <p>Please complete your payment and book your seat today:</p>
        <div style="margin:24px 0;">
          <a href="{{payment_link}}" style="background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Complete Payment Now</a>
        </div>
        <p style="color:#64748b;font-size:13px;">CBA Forum Organizing Committee</p>
      </div>
    `
    const htmlBody = fill(rawBody)

    const cleanPassword = SMTP_PASSWORD.trim().replace(/\s+/g, '')

    // Use standard Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.trim(),
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER.trim(),
        pass: cleanPassword,
      },
    })

    const plainText = `
Dear ${buyer.name || 'Participant'},

You are eligible to participate in ${s.event_name || 'CBA Forum 2026'}.

Event Details:
- Location: ${s.event_location || 'Waters Edge Hotel'}
- Time: ${s.event_time || '3:00 PM – 7:00 PM'}
- Ticket Price: ${s.ticket_price || 'LKR 3,000'}

Your Details:
- Name: ${buyer.name || ''}
- Mobile: ${buyer.mobile || ''}
- Email: ${buyer.email || ''}

Complete your payment and book your seat:
${s.payment_link || 'https://pay.cbaforum.lk'}

Thank you,
${fromName}
`.trim()

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      to: buyer.email.trim(),
      subject: subject,
      text: plainText,
      html: htmlBody,
    })

    if (targetId) {
      await supabase.from('buyers').update({
        email_status: 'sent',
        email_sent_at: new Date().toISOString(),
        email_error: null,
      }).eq('id', targetId)
    }

    return new Response(
      JSON.stringify({ success: true, message: `Email delivered to ${buyer.email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Send email error:', message)

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
      const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
      if (SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
        const body = await req.clone().json().catch(() => ({}))
        const targetId = body.buyer_id || body.buyer?.id
        if (targetId) {
          await supabase.from('buyers').update({
            email_status: 'failed',
            email_error: message,
            email_sent_at: new Date().toISOString(),
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
