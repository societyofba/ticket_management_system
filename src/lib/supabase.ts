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
  sms_status: 'not_sent' | 'sending' | 'sent' | 'failed'
  sms_sent_at: string | null
  sms_error: string | null
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded'
  payment_confirmed_at: string | null
  payment_ref: string | null
  ticket_number: string | null
  ticket_email_status: 'not_sent' | 'sending' | 'sent' | 'failed'
  ticket_email_sent_at: string | null
  ticket_email_error: string | null
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export type AdminRole = 'super_admin' | 'admin' | 'viewer'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  password?: string
  avatar?: string | null
  created_at?: string
  updated_at?: string
}

export type BuyerInsert = Omit<
  Buyer,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'email_status'
  | 'email_sent_at'
  | 'email_error'
  | 'sms_status'
  | 'sms_sent_at'
  | 'sms_error'
  | 'payment_status'
  | 'payment_confirmed_at'
  | 'payment_ref'
  | 'ticket_number'
  | 'ticket_email_status'
  | 'ticket_email_sent_at'
  | 'ticket_email_error'
  | 'checked_in'
  | 'checked_in_at'
> & {
  email_status?: Buyer['email_status']
  email_sent_at?: string | null
  email_error?: string | null
  sms_status?: Buyer['sms_status']
  sms_sent_at?: string | null
  sms_error?: string | null
  payment_status?: Buyer['payment_status']
  payment_confirmed_at?: string | null
  payment_ref?: string | null
  ticket_number?: string | null
  ticket_email_status?: Buyer['ticket_email_status']
  ticket_email_sent_at?: string | null
  ticket_email_error?: string | null
  checked_in?: boolean
  checked_in_at?: string | null
}

