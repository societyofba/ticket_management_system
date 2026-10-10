import { supabase } from '../lib/supabase'
import type { Buyer } from '../lib/supabase'

export async function sendBuyerEmail(
  buyerId: string,
  buyerData?: Partial<Buyer>
): Promise<{ success: boolean; error?: string }> {
  // Mark as sending in DB
  await supabase
    .from('buyers')
    .update({ email_status: 'sending' })
    .eq('id', buyerId)

  const { data, error } = await supabase.functions.invoke('send-buyer-email', {
    body: { buyer_id: buyerId, buyer: buyerData },
  })

  if (error) {
    await supabase
      .from('buyers')
      .update({
        email_status: 'failed',
        email_error: error.message,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: error.message }
  }

  if (data && !data.success) {
    await supabase
      .from('buyers')
      .update({
        email_status: 'failed',
        email_error: data.error,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: data.error }
  }

  // Mark as sent in DB
  await supabase
    .from('buyers')
    .update({
      email_status: 'sent',
      email_sent_at: new Date().toISOString(),
      email_error: null,
    })
    .eq('id', buyerId)

  return { success: true }
}

export async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error || !data) return {}
  return Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]))
}

export async function saveSetting(key: string, value: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return { error: error.message }
  return {}
}

export async function saveSettings(
  settings: Record<string, string>
): Promise<{ error?: string }> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return { error: error.message }
  return {}
}
