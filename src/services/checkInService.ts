import { supabase, type Buyer } from '../lib/supabase'

export async function getCheckedInBuyers(): Promise<{ data: Buyer[]; error: string | null }> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('checked_in', true)
    .order('checked_in_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: (data as Buyer[]) || [], error: null }
}

export async function checkInByTicketNumber(
  ticketNumber: string
): Promise<{ data: Buyer | null; error: string | null; alreadyCheckedIn?: boolean }> {
  // First look up the buyer by ticket_number
  const { data: buyers, error: lookupError } = await supabase
    .from('buyers')
    .select('*')
    .eq('ticket_number', ticketNumber.trim().toUpperCase())
    .limit(1)

  if (lookupError) return { data: null, error: lookupError.message }
  if (!buyers || buyers.length === 0) {
    return { data: null, error: `No ticket found with number ${ticketNumber}` }
  }

  const buyer = buyers[0] as Buyer

  if (buyer.checked_in) {
    return { data: buyer, error: null, alreadyCheckedIn: true }
  }

  // Mark as checked in
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('buyers')
    .update({ checked_in: true, checked_in_at: now })
    .eq('id', buyer.id)
    .select()
    .single()

  if (updateError) return { data: null, error: updateError.message }
  return { data: updated as Buyer, error: null, alreadyCheckedIn: false }
}

export async function manualCheckIn(
  buyerId: string
): Promise<{ data: Buyer | null; error: string | null }> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('buyers')
    .update({ checked_in: true, checked_in_at: now })
    .eq('id', buyerId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Buyer, error: null }
}

export async function undoCheckIn(
  buyerId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('buyers')
    .update({ checked_in: false, checked_in_at: null })
    .eq('id', buyerId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function getCheckInStats(): Promise<{
  totalPaid: number
  checkedIn: number
  notYetArrived: number
  error: string | null
}> {
  const { data, error } = await supabase
    .from('buyers')
    .select('checked_in, payment_status')

  if (error) return { totalPaid: 0, checkedIn: 0, notYetArrived: 0, error: error.message }

  const paid = (data || []).filter((b) => b.payment_status === 'paid')
  const checkedIn = paid.filter((b) => b.checked_in)

  return {
    totalPaid: paid.length,
    checkedIn: checkedIn.length,
    notYetArrived: paid.length - checkedIn.length,
    error: null,
  }
}
