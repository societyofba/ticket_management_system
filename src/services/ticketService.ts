import { supabase } from '../lib/supabase'
import type { Buyer } from '../lib/supabase'

export function generateTicketNumber(buyerId: string): string {
  const shortId = buyerId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `CBA-2026-${shortId || randomSuffix}`
}

export async function sendBuyerTicketEmail(
  buyerId: string,
  buyerData?: Partial<Buyer>
): Promise<{ success: boolean; error?: string; ticket_number?: string }> {
  // Mark as sending in DB
  await supabase
    .from('buyers')
    .update({ ticket_email_status: 'sending' })
    .eq('id', buyerId)

  const { data, error } = await supabase.functions.invoke('send-buyer-ticket', {
    body: { buyer_id: buyerId, buyer: buyerData },
  })

  if (error) {
    await supabase
      .from('buyers')
      .update({
        ticket_email_status: 'failed',
        ticket_email_error: error.message,
        ticket_email_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: error.message }
  }

  if (data && !data.success) {
    await supabase
      .from('buyers')
      .update({
        ticket_email_status: 'failed',
        ticket_email_error: data.error,
        ticket_email_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: data.error }
  }

  // Mark as sent in DB
  await supabase
    .from('buyers')
    .update({
      ticket_email_status: 'sent',
      ticket_email_sent_at: new Date().toISOString(),
      ticket_email_error: null,
      ...(data?.ticket_number ? { ticket_number: data.ticket_number } : {}),
    })
    .eq('id', buyerId)

  return { success: true, ticket_number: data?.ticket_number }
}

export async function confirmPaymentAndIssueTicket(
  buyerId: string,
  paymentRef: string,
  existingBuyer?: Buyer
): Promise<{ success: boolean; error?: string; ticket_number?: string }> {
  const ticketNum = existingBuyer?.ticket_number || generateTicketNumber(buyerId)
  const now = new Date().toISOString()

  // 1. Update buyer to 'paid' in DB
  const { error: dbError } = await supabase
    .from('buyers')
    .update({
      payment_status: 'paid',
      payment_confirmed_at: now,
      payment_ref: paymentRef.trim() || 'PayHere Confirmed',
      ticket_number: ticketNum,
    })
    .eq('id', buyerId)

  if (dbError) {
    return { success: false, error: dbError.message }
  }

  // 2. Automatically dispatch ticket confirmation email
  const updatedBuyer: Partial<Buyer> = {
    ...(existingBuyer || {}),
    payment_status: 'paid',
    payment_ref: paymentRef,
    ticket_number: ticketNum,
  }

  const emailRes = await sendBuyerTicketEmail(buyerId, updatedBuyer)

  return {
    success: true,
    ticket_number: ticketNum,
    error: emailRes.success ? undefined : `Payment confirmed, but ticket email failed: ${emailRes.error}`,
  }
}

export async function updatePaymentStatus(
  buyerId: string,
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded',
  payment_ref?: string
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    payment_status,
  }

  if (payment_status === 'paid') {
    payload.payment_confirmed_at = new Date().toISOString()
    if (payment_ref) payload.payment_ref = payment_ref
  }

  const { error } = await supabase.from('buyers').update(payload).eq('id', buyerId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
