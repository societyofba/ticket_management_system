import { supabase, type AdminUser, type AdminRole } from '../lib/supabase'

export const FALLBACK_ADMINS: AdminUser[] = [
  {
    id: 'super-admin-default-id',
    name: 'Super Admin',
    email: 'superadmin@cbaforum.lk',
    role: 'super_admin',
    password: 'super123',
  },
  {
    id: 'regular-admin-default-id',
    name: 'Event Admin',
    email: 'admin@cbaforum.lk',
    role: 'admin',
    password: 'admin123',
  },
]

export async function loginAdmin(
  email: string,
  pass: string
): Promise<{ user: AdminUser | null; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanPass = pass.trim()

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (!error && data) {
      if (data.password === cleanPass) {
        return {
          user: {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role as AdminRole,
            avatar: data.avatar,
            created_at: data.created_at,
          },
          error: null,
        }
      } else {
        return { user: null, error: 'Incorrect password. Please try again.' }
      }
    }
  } catch (err) {
    console.warn('Database admins query failed, falling back to local defaults:', err)
  }

  // Fallback check against preset accounts
  const fallback = FALLBACK_ADMINS.find((a) => a.email.toLowerCase() === cleanEmail)
  if (fallback) {
    if (fallback.password === cleanPass) {
      return {
        user: {
          id: fallback.id,
          name: fallback.name,
          email: fallback.email,
          role: fallback.role,
        },
        error: null,
      }
    }
    return { user: null, error: 'Incorrect password. Please try again.' }
  }

  return { user: null, error: 'No admin account found with this email.' }
}

export async function getAllAdmins(): Promise<{ data: AdminUser[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, name, email, role, avatar, created_at, updated_at')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      return { data: data as AdminUser[], error: null }
    }
  } catch (err) {
    console.warn('Could not fetch admins from DB:', err)
  }

  // Return fallback admins (without exposing password)
  return {
    data: FALLBACK_ADMINS.map(({ id, name, email, role }) => ({ id, name, email, role })),
    error: null,
  }
}

export async function createAdminUser(newAdmin: {
  name: string
  email: string
  password: string
  role: AdminRole
}): Promise<{ data: AdminUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          name: newAdmin.name.trim(),
          email: newAdmin.email.trim().toLowerCase(),
          password: newAdmin.password.trim(),
          role: newAdmin.role,
        },
      ])
      .select('id, name, email, role, avatar, created_at')
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as AdminUser, error: null }
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create admin' }
  }
}

export async function updateAdminPassword(
  adminId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('admins')
      .update({ password: newPassword.trim(), updated_at: new Date().toISOString() })
      .eq('id', adminId)

    if (error) return { error: error.message }
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update password' }
  }
}
