import { supabase } from '../lib/supabase'
import type { Buyer } from '../lib/supabase'

async function extractErrorMessage(error: any): Promise<string> {
  if (error && error.context) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
      if (body?.message) return body.message
    } catch {
      try {
        const text = await error.context.text()
        if (text) return text
      } catch { /* ignore */ }
    }
  }
  return error?.message || 'Failed to send SMS'
}

export async function sendBuyerSms(
  buyerId: string,
  buyerData?: Partial<Buyer>
): Promise<{ success: boolean; error?: string }> {
  // Mark as sending in DB
  await supabase
    .from('buyers')
    .update({ sms_status: 'sending' })
    .eq('id', buyerId)

  const { data, error } = await supabase.functions.invoke('send-buyer-sms', {
    body: { buyer_id: buyerId, buyer: buyerData, message_type: 'invitation' },
  })

  if (error) {
    const errorMsg = await extractErrorMessage(error)
    await supabase
      .from('buyers')
      .update({
        sms_status: 'failed',
        sms_error: errorMsg,
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: errorMsg }
  }

  if (data && !data.success) {
    await supabase
      .from('buyers')
      .update({
        sms_status: 'failed',
        sms_error: data.error,
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: data.error }
  }

  // Mark as sent in DB
  await supabase
    .from('buyers')
    .update({
      sms_status: 'sent',
      sms_sent_at: new Date().toISOString(),
      sms_error: null,
    })
    .eq('id', buyerId)

  return { success: true }
}

export async function sendBuyerTicketSms(
  buyerId: string,
  buyerData?: Partial<Buyer>
): Promise<{ success: boolean; error?: string }> {
  // Always fetch fresh record from database so latest ticket_number, payment_ref and ticket_price are present
  const { data: dbBuyer } = await supabase.from('buyers').select('*').eq('id', buyerId).single()
  const merged = { ...(dbBuyer || {}), ...(buyerData || {}) }

  // Mark as sending in DB
  await supabase
    .from('buyers')
    .update({ ticket_sms_status: 'sending' })
    .eq('id', buyerId)

  const { data, error } = await supabase.functions.invoke('send-buyer-sms', {
    body: { buyer_id: buyerId, buyer: merged, message_type: 'ticket' },
  })

  if (error) {
    const errorMsg = await extractErrorMessage(error)
    await supabase
      .from('buyers')
      .update({
        ticket_sms_status: 'failed',
        ticket_sms_error: errorMsg,
        ticket_sms_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: errorMsg }
  }

  if (data && !data.success) {
    await supabase
      .from('buyers')
      .update({
        ticket_sms_status: 'failed',
        ticket_sms_error: data.error,
        ticket_sms_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: data.error }
  }

  // Mark as sent in DB
  await supabase
    .from('buyers')
    .update({
      ticket_sms_status: 'sent',
      ticket_sms_sent_at: new Date().toISOString(),
      ticket_sms_error: null,
    })
    .eq('id', buyerId)

  return { success: true }
}
