import { useEffect, useState } from 'react'
import { getBuyers } from '../services/buyerService'
import { getSettings } from '../services/emailService'
import { Users, CreditCard, Clock, FileCheck2 } from 'lucide-react'
import type { Buyer } from '../lib/supabase'

export default function Dashboard() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBuyers(), getSettings()]).then(([buyersRes, settingsRes]) => {
      setBuyers(buyersRes.data ?? [])
      if (settingsRes) setSettings(settingsRes)
      setLoading(false)
    })
  }, [])

  const paidCount = buyers.filter((b) => b.payment_status === 'paid').length
  const pendingCount = buyers.filter((b) => b.payment_status !== 'paid').length
  const priceValue = parseInt((settings.ticket_price || '3000').replace(/[^0-9]/g, '')) || 3000
  const totalRevenue = paidCount * priceValue
  const recentBuyers = buyers.slice(0, 5)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back &bull; CBA Forum 2026 Ticket Operations</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '–' : buyers.length}</div>
            <div className="stat-label">Total Registered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FileCheck2 size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '–' : paidCount}</div>
            <div className="stat-label">Paid Tickets Issued</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '–' : pendingCount}</div>
            <div className="stat-label">Pending PayHere Check</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <CreditCard size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? '–' : `LKR ${totalRevenue.toLocaleString()}`}
            </div>
            <div className="stat-label">Total Revenue Collected</div>
          </div>
        </div>
      </div>

      {/* Recent buyers */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Registrations</h2>
          <span style={{ fontSize: 12, color: '#8892aa' }}>Latest 5</span>
        </div>
        <div className="card-body" style={{ paddingTop: 12 }}>
          {loading ? (
            <p style={{ color: '#8892aa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Loading…
            </p>
          ) : recentBuyers.length === 0 ? (
            <p style={{ color: '#8892aa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No registrations yet. Add your first buyer to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentBuyers.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#f8f9fd',
                    border: '1px solid #eceef5',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: `hsl(${(b.name.charCodeAt(0) * 37) % 360}, 65%, 92%)`,
                        color: `hsl(${(b.name.charCodeAt(0) * 37) % 360}, 65%, 35%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a1f35', fontSize: 14 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: '#8892aa' }}>
                        {b.company} &bull; {b.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    {b.payment_status === 'paid' ? (
                      <span className="badge badge-green" style={{ fontSize: 11 }}>
                        Paid &bull; {b.ticket_number || 'Ticket Issued'}
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: 11 }}>
                        Unpaid
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
