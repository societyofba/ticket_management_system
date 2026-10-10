// Supabase Edge Function: send-buyer-sms
// Integrates SMSlenz Sri Lanka SMS Gateway (https://smslenz.lk)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeSriLankanMobile(rawNumber: string): string {
  // Remove non-digit characters except leading +
  let cleaned = rawNumber.trim().replace(/[\s\-\(\)]/g, '')

  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Handle local 07X format (e.g. 0771234567 -> 94771234567)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.substring(1)
  }
  // Handle 7X format without leading 0 (e.g. 771234567 -> 94771234567)
  else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '94' + cleaned
  }

  // Return formatted with leading + (e.g. +94771234567)
  return '+' + cleaned
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SMSLENZ_USER_ID   = Deno.env.get('SMSLENZ_USER_ID')
    const SMSLENZ_API_KEY   = Deno.env.get('SMSLENZ_API_KEY')
    const SMSLENZ_SENDER_ID = Deno.env.get('SMSLENZ_SENDER_ID') || 'CBAFORUM'

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
    const SUPABASE_KEY = Deno.env.get('SUPABASE_ANON_KEY')
      || req.headers.get('apikey')
      || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dmltcGt6YmJ3cGRndG9ucGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTAzNDAsImV4cCI6MjEwNzAyNjM0MH0.wO-ueoNKec--iQF2FZzDbhBSheo3TcTyUEVKetmwLqQ'

    if (!SMSLENZ_USER_ID || !SMSLENZ_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMSlenz credentials missing. Please set SMSLENZ_USER_ID and SMSLENZ_API_KEY in Supabase Secrets.',
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

    if (!buyer || !buyer.mobile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found or buyer has no mobile number.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetId = buyer_id || buyer.id
    if (targetId) {
      await supabase.from('buyers').update({ sms_status: 'sending' }).eq('id', targetId)
    }

    // Fetch settings from DB
    const { data: settingsRows } = await supabase.from('settings').select('key, value')
    const s: Record<string, string> = {
      event_name: 'CBA Forum 2026',
      event_location: 'Waters Edge Hotel',
      event_time: '3:00 PM – 7:00 PM',
      ticket_price: 'LKR 3,000',
      payment_link: 'https://pay.cbaforum.lk',
      sms_sender_id: SMSLENZ_SENDER_ID,
      sms_template: 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}} on {{event_time}}. Ticket: {{ticket_price}}. Complete payment & book: {{payment_link}}',
    }
    for (const row of settingsRows ?? []) {
      if (row.value) s[row.key] = row.value
    }

    const senderId = (s.sms_sender_id || SMSLENZ_SENDER_ID).trim()
    const rawTemplate = s.sms_template || 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}}. Ticket: {{ticket_price}}. Complete payment: {{payment_link}}'

    // Replace placeholders
    const message = rawTemplate
      .replace(/{{name}}/g,           buyer.name || 'Participant')
      .replace(/{{email}}/g,          buyer.email || '')
      .replace(/{{mobile}}/g,         buyer.mobile || '')
      .replace(/{{event_name}}/g,     s.event_name)
      .replace(/{{event_location}}/g, s.event_location)
      .replace(/{{event_time}}/g,     s.event_time)
      .replace(/{{ticket_price}}/g,   s.ticket_price)
      .replace(/{{payment_link}}/g,   s.payment_link)

    const formattedMobile = normalizeSriLankanMobile(buyer.mobile)

    // Call SMSlenz API
    const response = await fetch('https://smslenz.lk/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        user_id:   SMSLENZ_USER_ID.trim(),
        api_key:   SMSLENZ_API_KEY.trim(),
        sender_id: senderId,
        contact:   formattedMobile,
        message:   message,
      }),
    })

    const responseData = await response.json().catch(() => null)

    if (!response.ok || (responseData && responseData.status === false)) {
      const errMsg = responseData?.message || responseData?.error || `SMSlenz API error (HTTP ${response.status})`
      if (targetId) {
        await supabase.from('buyers').update({
          sms_status: 'failed',
          sms_error: errMsg,
          sms_sent_at: new Date().toISOString(),
        }).eq('id', targetId)
      }

      return new Response(
        JSON.stringify({ success: false, error: errMsg, details: responseData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as sent in DB
    if (targetId) {
      await supabase.from('buyers').update({
        sms_status: 'sent',
        sms_sent_at: new Date().toISOString(),
        sms_error: null,
      }).eq('id', targetId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS sent to ${formattedMobile} via SMSlenz (${senderId})`,
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
        if (targetId) {
          await supabase.from('buyers').update({
            sms_status: 'failed',
            sms_error: message,
            sms_sent_at: new Date().toISOString(),
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
