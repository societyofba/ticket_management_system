import { supabase, type Buyer, type BuyerInsert } from '../lib/supabase'

export async function getBuyers(): Promise<{ data: Buyer[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function createBuyer(
  buyer: BuyerInsert
): Promise<{ data: Buyer | null; error: string | null }> {
  const { data, error } = await supabase
    .from('buyers')
    .insert([buyer])
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function deleteBuyer(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('buyers').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function searchBuyers(
  query: string
): Promise<{ data: Buyer[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,mobile.ilike.%${query}%,company.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateBuyer(
  id: string,
  updates: Partial<Buyer>
): Promise<{ data: Buyer | null; error: string | null }> {
  const { data, error } = await supabase
    .from('buyers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
