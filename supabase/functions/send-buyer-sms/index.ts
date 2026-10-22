// Supabase Edge Function: send-buyer-sms
// Integrates Text.lk SMS Gateway (https://app.text.lk)
// Supports both 'invitation' SMS and confirmed 'ticket' SMS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeSriLankanMobile(rawNumber: string): string {
  // Strip non-digit characters except leading +
  let cleaned = rawNumber.trim().replace(/[\s\-\(\)\+]/g, '')

  // Handle local 07X format (e.g. 0771234567 -> 94771234567)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.substring(1)
  }
  // Handle 7X format without leading 0 (e.g. 771234567 -> 94771234567)
  else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '94' + cleaned
  }

  return cleaned
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TEXTLK_API_KEY   = Deno.env.get('TEXTLK_API_KEY') || Deno.env.get('TEXTLK_API_TOKEN')
    const TEXTLK_SENDER_ID = Deno.env.get('TEXTLK_SENDER_ID')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
    const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY')
      || req.headers.get('apikey')
      || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dmltcGt6YmJ3cGRndG9ucGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTAzNDAsImV4cCI6MjEwNzAyNjM0MH0.wO-ueoNKec--iQF2FZzDbhBSheo3TcTyUEVKetmwLqQ'

    if (!TEXTLK_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Text.lk API key missing. Please set TEXTLK_API_KEY in Supabase Secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const buyer_id = body.buyer_id
    const message_type: 'invitation' | 'ticket' = body.message_type === 'ticket' ? 'ticket' : 'invitation'
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

    if (!buyer || !buyer.mobile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found or buyer has no mobile number.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetId = buyer_id || buyer.id
    if (targetId) {
      if (message_type === 'ticket') {
        await supabase.from('buyers').update({ ticket_sms_status: 'sending' }).eq('id', targetId)
      } else {
        await supabase.from('buyers').update({ sms_status: 'sending' }).eq('id', targetId)
      }
    }

    // Fetch settings from DB
    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const s: Record<string, string> = {
      event_name: 'CBA Forum 2026',
      event_location: 'Waters Edge Hotel',
      event_time: '3:00 PM – 7:00 PM',
      ticket_price: 'LKR 3,500',
      payment_link: 'https://pay.cbaforum.lk',
      sms_template: 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}} on {{event_time}}. Ticket: {{ticket_price}}. Complete payment & book: {{payment_link}}',
      ticket_sms_template: 'CBA Forum 2026 - Ticket Confirmed! Ticket: {{ticket_number}} | Ref: {{payment_ref}}. Name: {{name}}, Org: {{company}} ({{designation}}), Email: {{email}}, Mobile: {{mobile}}, Paid: {{ticket_price}}. Your ticket with the QR code has been sent to the email address above. Please check your inbox (if not in inbox, check spam). Inquiries: info@cbaforum.lk',
    }
    for (const row of settingsRows ?? []) {
      if (row.value) s[row.key] = row.value
    }

    // Priority: 1. TEXTLK_SENDER_ID secret, 2. Database sms_sender_id (if not SMSlenzDEMO), 3. 'CBAFORUM'
    const dbSender = s.sms_sender_id && s.sms_sender_id !== 'SMSlenzDEMO' ? s.sms_sender_id.trim() : ''
    const senderId = (TEXTLK_SENDER_ID || dbSender || 'CBAFORUM').trim()

    const rawTemplate = message_type === 'ticket'
      ? (s.ticket_sms_template || 'CBA Forum 2026 - Ticket Confirmed! Ticket: {{ticket_number}}. Name: {{name}}, Paid: {{ticket_price}}. Your ticket was emailed. Info: info@cbaforum.lk')
      : (s.sms_template || 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}}. Ticket: {{ticket_price}}. Complete payment: {{payment_link}}')

    const ticketPrice = buyer.ticket_price || s.ticket_price || 'LKR 3,500'

    // Replace placeholders
    const message = rawTemplate
      .replace(/{{name}}/g,             buyer.name || 'Participant')
      .replace(/{{email}}/g,            buyer.email || '')
      .replace(/{{mobile}}/g,           buyer.mobile || '')
      .replace(/{{company}}/g,          buyer.company || '')
      .replace(/{{designation}}/g,      buyer.designation || '')
      .replace(/{{meal_preference}}/g,  buyer.meal_preference || '')
      .replace(/{{ticket_number}}/g,    buyer.ticket_number || 'N/A')
      .replace(/{{payment_ref}}/g,      buyer.payment_ref || 'PayHere Confirmed')
      .replace(/{{event_name}}/g,       s.event_name)
      .replace(/{{event_location}}/g,   s.event_location)
      .replace(/{{event_time}}/g,       s.event_time)
      .replace(/{{ticket_price}}/g,     ticketPrice)
      .replace(/{{payment_link}}/g,     s.payment_link)

    const formattedMobile = normalizeSriLankanMobile(buyer.mobile)

    // Call Text.lk API v3
    const response = await fetch('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEXTLK_API_KEY.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        recipient: formattedMobile,
        sender_id: senderId,
        type: 'plain',
        message: message,
      }),
    })

    const responseData = await response.json().catch(() => null)

    let isSuccess = false
    let errMsg = ''

    if (response.ok && responseData?.status === 'success') {
      isSuccess = true
    } else {
      isSuccess = false
      errMsg = responseData?.message || `Text.lk API error (HTTP ${response.status})`
    }

    if (!isSuccess) {
      if (targetId) {
        if (message_type === 'ticket') {
          await supabase.from('buyers').update({
            ticket_sms_status: 'failed',
            ticket_sms_error: errMsg,
            ticket_sms_sent_at: new Date().toISOString(),
          }).eq('id', targetId)
        } else {
          await supabase.from('buyers').update({
            sms_status: 'failed',
            sms_error: errMsg,
            sms_sent_at: new Date().toISOString(),
          }).eq('id', targetId)
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: errMsg, details: responseData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as sent in DB
    if (targetId) {
      if (message_type === 'ticket') {
        await supabase.from('buyers').update({
          ticket_sms_status: 'sent',
          ticket_sms_sent_at: new Date().toISOString(),
          ticket_sms_error: null,
        }).eq('id', targetId)
      } else {
        await supabase.from('buyers').update({
          sms_status: 'sent',
          sms_sent_at: new Date().toISOString(),
          sms_error: null,
        }).eq('id', targetId)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS (${message_type}) sent to ${formattedMobile} via Text.lk (${senderId})`,
        data: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Send SMS error:', message)

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
      const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
      if (SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
        const body = await req.clone().json().catch(() => ({}))
        const targetId = body.buyer_id || body.buyer?.id
        const isTicketMsg = body.message_type === 'ticket'
        if (targetId) {
          if (isTicketMsg) {
            await supabase.from('buyers').update({
              ticket_sms_status: 'failed',
              ticket_sms_error: message,
              ticket_sms_sent_at: new Date().toISOString(),
            }).eq('id', targetId)
          } else {
            await supabase.from('buyers').update({
              sms_status: 'failed',
              sms_error: message,
              sms_sent_at: new Date().toISOString(),
            }).eq('id', targetId)
          }
        }
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
