import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import AddBuyerForm from './components/AddBuyerForm'
import BuyerList from './components/BuyerList'
import SettingsPage from './components/SettingsPage'
import './index.css'

type Page = 'dashboard' | 'buyers' | 'add-buyer' | 'settings'

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of the CBA Forum ticket system' },
  buyers: { title: 'All Buyers', subtitle: 'Manage and search buyer records' },
  'add-buyer': { title: 'Add Buyer', subtitle: 'Register a new buyer in the system' },
  settings: { title: 'Settings', subtitle: 'Configure event details and email template' },
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [listRefresh, setListRefresh] = useState(0)

  function navigate(page: Page) {
    setCurrentPage(page)
  }

  function handleBuyerAdded() {
    setListRefresh((n) => n + 1)
  }

  const { title, subtitle } = PAGE_TITLES[currentPage]

  return (
    <>
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

      <div className="admin-layout">
        <Sidebar currentPage={currentPage} onNavigate={navigate} />

        <div className="main-content">
          {/* Top bar */}
          <header className="topbar">
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-subtitle">{subtitle}</div>
            </div>
          </header>

          {/* Page content */}
          <main className="page-content">
            {currentPage === 'dashboard' && <Dashboard />}

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
          </main>
        </div>
      </div>
    </>
  )
}
