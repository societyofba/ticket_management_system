import { Users, LayoutDashboard, UserPlus, Settings, CreditCard, Lock, LogOut, Shield, ScanLine, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  currentPage: 'dashboard' | 'buyers' | 'payments' | 'add-buyer' | 'settings' | 'checkin'
  onNavigate: (page: 'dashboard' | 'buyers' | 'payments' | 'add-buyer' | 'settings' | 'checkin') => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { currentAdmin, isSuperAdmin, isViewer, logout } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-badge">
          <div className="logo-icon">CB</div>
          <div className="logo-text">
            <h2>CBA Forum</h2>
            <p>Ticket Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="nav-section-label">Overview</div>

        <button
          className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard className="nav-icon" />
          Dashboard
        </button>

        <div className="nav-section-label" style={{ marginTop: 20 }}>Event Operations</div>

        <button
          className={`nav-link ${currentPage === 'checkin' ? 'active' : ''}`}
          onClick={() => onNavigate('checkin')}
          style={{ position: 'relative' }}
        >
          <ScanLine className="nav-icon" />
          <span>Check-In</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              fontWeight: 800,
              background: 'rgba(34, 197, 94, 0.25)',
              color: '#4ade80',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              padding: '1px 6px',
              borderRadius: 20,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              animation: 'pulse 2s infinite',
            }}
          >
            LIVE
          </span>
        </button>

        <button
          className={`nav-link ${currentPage === 'payments' ? 'active' : ''}`}
          onClick={() => onNavigate('payments')}
        >
          <CreditCard className="nav-icon" />
          Payments & Tickets
        </button>

        <button
          className={`nav-link ${currentPage === 'buyers' ? 'active' : ''}`}
          onClick={() => onNavigate('buyers')}
        >
          <Users className="nav-icon" />
          All Buyers
        </button>

        {!isViewer ? (
          <button
            className={`nav-link ${currentPage === 'add-buyer' ? 'active' : ''}`}
            onClick={() => onNavigate('add-buyer')}
          >
            <UserPlus className="nav-icon" />
            Add Buyer
          </button>
        ) : (
          <button
            className="nav-link"
            style={{ opacity: 0.55, cursor: 'not-allowed', display: 'flex', justifyContent: 'space-between' }}
            onClick={() => {}}
            title="Viewer account (Read-Only) cannot add buyers"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus className="nav-icon" />
              <span>Add Buyer</span>
            </div>
            <span
              style={{
                fontSize: 10,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '2px 6px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontWeight: 600,
              }}
            >
              <Lock size={10} /> Locked
            </span>
          </button>
        )}

        <div className="nav-section-label" style={{ marginTop: 20 }}>System</div>

        <button
          className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings className="nav-icon" />
            <span>Settings</span>
          </div>
          {!isSuperAdmin && (
            <span
              style={{
                fontSize: 10,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '2px 6px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontWeight: 600,
              }}
              title="Super Admin Only"
            >
              <Lock size={10} /> Locked
            </span>
          )}
        </button>
      </nav>

      {/* Current User & Role Box */}
      <div
        style={{
          padding: '16px 18px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isSuperAdmin
                  ? 'linear-gradient(135deg, #8b5cf6, #d946ef)'
                  : isViewer
                  ? 'linear-gradient(135deg, #64748b, #475569)'
                  : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: isSuperAdmin
                  ? '0 2px 8px rgba(139, 92, 246, 0.4)'
                  : isViewer
                  ? '0 2px 8px rgba(100, 116, 139, 0.3)'
                  : '0 2px 8px rgba(59, 130, 246, 0.4)',
              }}
            >
              {currentAdmin?.name?.charAt(0) || (isViewer ? 'V' : 'A')}
            </div>
            <div>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  maxWidth: 120,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentAdmin?.name || (isViewer ? 'Viewer' : 'Admin')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: isSuperAdmin
                      ? 'rgba(168, 85, 247, 0.25)'
                      : isViewer
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(59, 130, 246, 0.25)',
                    color: isSuperAdmin ? '#c084fc' : isViewer ? '#fbbf24' : '#93c5fd',
                    border: isSuperAdmin
                      ? '1px solid rgba(192, 132, 252, 0.3)'
                      : isViewer
                      ? '1px solid rgba(251, 191, 36, 0.3)'
                      : '1px solid rgba(147, 197, 253, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {isViewer ? <Eye size={9} /> : <Shield size={9} />}
                  {isSuperAdmin ? 'Super Admin' : isViewer ? 'View Only' : 'Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign Out"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
              e.currentTarget.style.background = 'none'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
