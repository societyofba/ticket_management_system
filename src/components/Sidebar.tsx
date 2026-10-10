import { Users, LayoutDashboard, UserPlus, Settings } from 'lucide-react'

interface SidebarProps {
  currentPage: 'dashboard' | 'buyers' | 'add-buyer' | 'settings'
  onNavigate: (page: 'dashboard' | 'buyers' | 'add-buyer' | 'settings') => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
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
      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>

        <button
          className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard className="nav-icon" />
          Dashboard
        </button>

        <div className="nav-section-label" style={{ marginTop: 20 }}>Buyers</div>

        <button
          className={`nav-link ${currentPage === 'buyers' ? 'active' : ''}`}
          onClick={() => onNavigate('buyers')}
        >
          <Users className="nav-icon" />
          All Buyers
        </button>

        <button
          className={`nav-link ${currentPage === 'add-buyer' ? 'active' : ''}`}
          onClick={() => onNavigate('add-buyer')}
        >
          <UserPlus className="nav-icon" />
          Add Buyer
        </button>

        <div className="nav-section-label" style={{ marginTop: 20 }}>System</div>

        <button
          className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings className="nav-icon" />
          Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        CBA Forum © 2026
      </div>
    </aside>
  )
}
