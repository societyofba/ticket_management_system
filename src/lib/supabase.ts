import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export type Database = {
  public: {
    Tables: {
      buyers: {
        Row: Buyer
        Insert: BuyerInsert
        Update: Partial<BuyerInsert>
      }
    }
  }
}

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
  email_status: 'not_sent' | 'sending' | 'sent' | 'failed'
  email_sent_at: string | null
  email_error: string | null
  created_at: string
  updated_at: string
}

export type BuyerInsert = Omit<Buyer, 'id' | 'created_at' | 'updated_at'>
