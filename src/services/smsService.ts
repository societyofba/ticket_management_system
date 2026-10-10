import { supabase } from '../lib/supabase'
import type { Buyer } from '../lib/supabase'

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
    body: { buyer_id: buyerId, buyer: buyerData },
  })

  if (error) {
    await supabase
      .from('buyers')
      .update({
        sms_status: 'failed',
        sms_error: error.message,
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', buyerId)
    return { success: false, error: error.message }
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
