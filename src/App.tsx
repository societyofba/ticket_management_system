import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import AddBuyerForm from './components/AddBuyerForm'
import BuyerList from './components/BuyerList'
import PaymentsPage from './components/PaymentsPage'
import SettingsPage from './components/SettingsPage'
import CheckInPage from './components/CheckInPage'
import LoginPage from './components/LoginPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Shield, LogOut, Eye, Menu, X, LayoutDashboard, Users, CreditCard, ScanLine, Settings, UserPlus } from 'lucide-react'
import './index.css'

type Page = 'dashboard' | 'buyers' | 'payments' | 'add-buyer' | 'settings' | 'checkin'

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of the CBA Forum ticket system' },
  payments: { title: 'Payments & E-Tickets', subtitle: 'Verify PayHere transactions and issue digital tickets' },
  buyers: { title: 'All Buyers', subtitle: 'Manage and search buyer records' },
  'add-buyer': { title: 'Add Buyer', subtitle: 'Register a new buyer in the system' },
  settings: { title: 'Settings', subtitle: 'Configure event details, email templates, and SMS settings' },
  checkin: { title: '📡 Check-In', subtitle: 'Real-time event day arrival tracking' },
}

function MainLayout() {
  const { currentAdmin, isSuperAdmin, isViewer, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [listRefresh, setListRefresh] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!currentAdmin) {
    return <LoginPage />
  }

  function navigate(page: Page) {
    setCurrentPage(page)
    setSidebarOpen(false) // close sidebar after navigation on mobile
  }

  function handleBuyerAdded() {
    setListRefresh((n) => n + 1)
  }

  const { title, subtitle } = PAGE_TITLES[currentPage]

  return (
    <div className="admin-layout">
      {/* Mobile sidebar overlay backdrop */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar currentPage={currentPage} onNavigate={navigate} mobileOpen={sidebarOpen} />

      <div className="main-content">
        {/* Top bar */}
        <header className="topbar" style={{ padding: '0 28px' }}>
          {/* Hamburger - only visible on mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-subtitle">{subtitle}</div>
          </div>

          {/* Right Header: Role & User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isViewer
                  ? 'rgba(217, 119, 6, 0.08)'
                  : isSuperAdmin
                  ? 'rgba(147, 51, 234, 0.08)'
                  : 'rgba(37, 99, 235, 0.08)',
                border: isViewer
                  ? '1px solid rgba(217, 119, 6, 0.25)'
                  : isSuperAdmin
                  ? '1px solid rgba(147, 51, 234, 0.25)'
                  : '1px solid rgba(37, 99, 235, 0.25)',
                padding: '5px 10px',
                borderRadius: 20,
              }}
            >
              {isViewer ? (
                <Eye size={13} color="#d97706" />
              ) : (
                <Shield size={13} color={isSuperAdmin ? '#9333ea' : '#2563eb'} />
              )}
              <span
                className="topbar-role-label"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: isViewer ? '#b45309' : isSuperAdmin ? '#7e22ce' : '#1d4ed8',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {isViewer ? 'Observer' : isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={logout}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#dc2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="topbar-role-label">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {currentPage === 'dashboard' && <Dashboard />}

          {currentPage === 'payments' && <PaymentsPage />}

          {currentPage === 'buyers' && (
            <BuyerList
              onAddBuyer={() => navigate('add-buyer')}
              refreshTrigger={listRefresh}
            />
          )}

          {currentPage === 'add-buyer' && (
            <AddBuyerForm
              onSuccess={handleBuyerAdded}
              onNavigateToBuyers={() => navigate('buyers')}
            />
          )}

          {currentPage === 'settings' && <SettingsPage />}

          {currentPage === 'checkin' && <CheckInPage />}
        </main>

        {/* Mobile bottom navigation bar */}
        <nav className="mobile-bottom-nav">
          <div className="mobile-bottom-nav-inner">
            <button
              className={`mobile-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('dashboard')}
            >
              <LayoutDashboard size={20} />
              Home
            </button>
            <button
              className={`mobile-nav-item ${currentPage === 'buyers' ? 'active' : ''}`}
              onClick={() => navigate('buyers')}
            >
              <Users size={20} />
              Buyers
            </button>
            <button
              className={`mobile-nav-item ${currentPage === 'payments' ? 'active' : ''}`}
              onClick={() => navigate('payments')}
            >
              <CreditCard size={20} />
              Payments
            </button>
            <button
              className={`mobile-nav-item ${currentPage === 'checkin' ? 'active' : ''}`}
              onClick={() => navigate('checkin')}
            >
              <ScanLine size={20} />
              Check-In
            </button>
            {!isViewer && (
              <button
                className={`mobile-nav-item ${currentPage === 'add-buyer' ? 'active' : ''}`}
                onClick={() => navigate('add-buyer')}
              >
                <UserPlus size={20} />
                Add
              </button>
            )}
            <button
              className={`mobile-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
              onClick={() => navigate('settings')}
            >
              <Settings size={20} />
              Settings
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13.5px',
            borderRadius: '10px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          },
        }}
      />
      <MainLayout />
    </AuthProvider>
  )
}
