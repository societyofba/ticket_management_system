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
import { Shield, LogOut, Eye } from 'lucide-react'
import './index.css'

type Page = 'dashboard' | 'buyers' | 'payments' | 'add-buyer' | 'settings' | 'checkin'

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of the CBA Forum ticket system' },
  payments: { title: 'Payments & E-Tickets', subtitle: 'Verify PayHere transactions and issue digital tickets' },
  buyers: { title: 'All Buyers', subtitle: 'Manage and search buyer records' },
  'add-buyer': { title: 'Add Buyer', subtitle: 'Register a new buyer in the system' },
  settings: { title: 'Settings', subtitle: 'Configure event details, email templates, and SMS settings' },
  checkin: { title: '📡 Check-In Dashboard', subtitle: 'Real-time event day arrival tracking — updates every 5 seconds' },
}

function MainLayout() {
  const { currentAdmin, isSuperAdmin, isViewer, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [listRefresh, setListRefresh] = useState(0)

  if (!currentAdmin) {
    return <LoginPage />
  }

  function navigate(page: Page) {
    setCurrentPage(page)
  }

  function handleBuyerAdded() {
    setListRefresh((n) => n + 1)
  }

  const { title, subtitle } = PAGE_TITLES[currentPage]

  return (
    <div className="admin-layout">
      <Sidebar currentPage={currentPage} onNavigate={navigate} />

      <div className="main-content">
        {/* Top bar */}
        <header className="topbar" style={{ padding: '0 28px' }}>
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-subtitle">{subtitle}</div>
          </div>

          {/* Right Header: Role & User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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
                padding: '6px 12px',
                borderRadius: 20,
              }}
            >
              {isViewer ? (
                <Eye size={14} color="#d97706" />
              ) : (
                <Shield size={14} color={isSuperAdmin ? '#9333ea' : '#2563eb'} />
              )}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isViewer ? '#b45309' : isSuperAdmin ? '#7e22ce' : '#1d4ed8',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {isViewer ? 'View Only (Observer)' : isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                ({currentAdmin.name})
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
              <span>Sign Out</span>
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
