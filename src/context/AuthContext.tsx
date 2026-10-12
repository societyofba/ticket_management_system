import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type AdminUser, type AdminRole } from '../lib/supabase'
import { loginAdmin } from '../services/authService'
import toast from 'react-hot-toast'

interface AuthContextType {
  currentAdmin: AdminUser | null
  role: AdminRole | null
  isSuperAdmin: boolean
  isViewer: boolean
  canDeleteBuyers: boolean
  canChangeSettings: boolean
  canAddBuyers: boolean
  canSendEmails: boolean
  canManagePayments: boolean
  canCheckIn: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'cba_active_admin'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as AdminUser
      }
    } catch {
      // ignore
    }
    return null
  })

  useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAdmin))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [currentAdmin])

  const role = currentAdmin?.role ?? null
  const isSuperAdmin = role === 'super_admin'
  const isViewer = role === 'viewer'
  const canDeleteBuyers = isSuperAdmin
  const canChangeSettings = isSuperAdmin
  const canAddBuyers = !isViewer
  const canSendEmails = !isViewer
  const canManagePayments = !isViewer
  const canCheckIn = !isViewer

  async function login(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const { user, error } = await loginAdmin(email, pass)
    if (error || !user) {
      return { success: false, error: error || 'Login failed' }
    }
    setCurrentAdmin(user)
    const roleLabel =
      user.role === 'super_admin'
        ? 'Super Admin'
        : user.role === 'viewer'
        ? 'Viewer (Read-Only Mode)'
        : 'Event Admin'
    toast.success(`Welcome, ${user.name}! (${roleLabel})`)
    return { success: true }
  }

  function logout() {
    setCurrentAdmin(null)
    toast('Logged out successfully', { icon: '👋' })
  }

  return (
    <AuthContext.Provider
      value={{
        currentAdmin,
        role,
        isSuperAdmin,
        isViewer,
        canDeleteBuyers,
        canChangeSettings,
        canAddBuyers,
        canSendEmails,
        canManagePayments,
        canCheckIn,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
