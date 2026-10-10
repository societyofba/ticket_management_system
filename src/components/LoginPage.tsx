import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, ArrowRight, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    const res = await login(email, password)
    setLoading(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid email or password')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top left, #1e295d 0%, #0c122b 50%, #060919 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 58,
              height: 58,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.45)',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: -1 }}>CB</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 6px', color: '#ffffff' }}>
            CBA Forum 2026
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.65)' }}>
            Ticket Management &bull; Admin Sign In
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
              fontSize: 13,
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleFormSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.75)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.4)',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cbaforum.lk"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.75)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.4)',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14.5,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Credentials Reference Note */}
        <div
          style={{
            marginTop: 28,
            padding: '14px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.65)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            <KeyRound size={13} color="#93c5fd" />
            <span>Authorized Accounts:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div>&bull; <strong style={{ color: '#c4b5fd' }}>Super Admin:</strong> superadmin@cbaforum.lk (Password: super123)</div>
            <div>&bull; <strong style={{ color: '#93c5fd' }}>Event Admin:</strong> admin@cbaforum.lk (Password: admin123)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
