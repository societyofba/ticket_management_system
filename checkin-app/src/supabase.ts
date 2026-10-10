import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://vzvimpkzbbwpdgtonpgr.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dmltcGt6YmJ3cGRndG9ucGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTAzNDAsImV4cCI6MjEwNzAyNjM0MH0.wO-ueoNKec--iQF2FZzDbhBSheo3TcTyUEVKetmwLqQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export interface Buyer {
  id: string
  name: string
  email: string
  mobile: string
  company: string
  designation: string
  meal_preference: 'vegetarian' | 'non_vegetarian' | 'other'
  meal_notes: string | null
  special_notes: string | null
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded'
  payment_ref: string | null
  ticket_number: string | null
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
}
