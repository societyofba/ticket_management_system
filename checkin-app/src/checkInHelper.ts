import { supabase, type Buyer } from './supabase'

export function extractTicketIdentifier(scannedText: string): { ticketNumber?: string; id?: string } {
  const text = (scannedText || '').trim()

  // 1. Check for "TICKET:..." format (matches CBA Forum QR code payload)
  const ticketMatch = text.match(/TICKET:([^|\s\n]+)/i)
  if (ticketMatch && ticketMatch[1]) {
    return { ticketNumber: ticketMatch[1].trim() }
  }

  // 2. Try JSON format
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text)
      if (parsed.ticket_number || parsed.ticketNumber) {
        return { ticketNumber: (parsed.ticket_number || parsed.ticketNumber).trim() }
      }
      if (parsed.id) {
        return { id: String(parsed.id).trim() }
      }
    } catch {}
  }

  // 3. UUID regex format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(text)) {
    return { id: text }
  }

  // 4. Direct ticket number string
  return { ticketNumber: text }
}

export async function lookupAttendee(
  query: string
): Promise<{ data: Buyer | null; error: string | null }> {
  const parsed = extractTicketIdentifier(query)

  if (parsed.ticketNumber) {
    const cleanNum = parsed.ticketNumber.trim()

    // Match exact ticket_number column
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .ilike('ticket_number', cleanNum)
      .limit(1)

    if (error) return { data: null, error: error.message }
    if (data && data.length > 0) return { data: data[0] as Buyer, error: null }

    // Fallback: if generated as CBA-2026-XXXX where XXXX is buyer id prefix
    if (cleanNum.toUpperCase().startsWith('CBA-2026-')) {
      const idPrefix = cleanNum.substring('CBA-2026-'.length).toLowerCase()
      if (idPrefix) {
        const { data: idMatches } = await supabase
          .from('buyers')
          .select('*')
          .ilike('id', `${idPrefix}%`)
          .limit(1)

        if (idMatches && idMatches.length > 0) {
          return { data: idMatches[0] as Buyer, error: null }
        }
      }
    }
  }

  if (parsed.id) {
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', parsed.id)
      .limit(1)

    if (error) return { data: null, error: error.message }
    if (data && data.length > 0) return { data: data[0] as Buyer, error: null }
  }

  // Fallback: search by name, email, or mobile (for manual search input)
  const trimmed = query.trim()
  if (trimmed.length >= 2) {
    const { data: searchMatches } = await supabase
      .from('buyers')
      .select('*')
      .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,mobile.ilike.%${trimmed}%`)
      .limit(1)

    if (searchMatches && searchMatches.length > 0) {
      return { data: searchMatches[0] as Buyer, error: null }
    }
  }

  return { data: null, error: `No attendee found for "${query}"` }
}

export async function confirmCheckIn(
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

export async function undoCheckIn(buyerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('buyers')
    .update({ checked_in: false, checked_in_at: null })
    .eq('id', buyerId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function getLiveStats(): Promise<{ checkedIn: number; totalPaid: number }> {
  const { data } = await supabase
    .from('buyers')
    .select('checked_in, payment_status')

  if (!data) return { checkedIn: 0, totalPaid: 0 }
  const paid = data.filter((b) => b.payment_status === 'paid')
  const checkedIn = paid.filter((b) => b.checked_in)
  return { checkedIn: checkedIn.length, totalPaid: paid.length }
}

export async function getRecentCheckIns(limit = 15): Promise<Buyer[]> {
  const { data } = await supabase
    .from('buyers')
    .select('*')
    .eq('checked_in', true)
    .order('checked_in_at', { ascending: false })
    .limit(limit)

  return (data as Buyer[]) || []
}
