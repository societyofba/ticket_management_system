import { useEffect, useState } from 'react'
import { getBuyers } from '../services/buyerService'
import { Users, UserCheck, UtensilsCrossed, TrendingUp } from 'lucide-react'
import type { Buyer } from '../lib/supabase'

export default function Dashboard() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBuyers().then(({ data }) => {
      setBuyers(data ?? [])
      setLoading(false)
    })
  }, [])

  const vegCount = buyers.filter((b) => b.meal_preference === 'vegetarian').length
  const nonVegCount = buyers.filter((b) => b.meal_preference === 'non_vegetarian').length
  const recentBuyers = buyers.slice(0, 5)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back. Here's your current overview.</p>
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
            <div className="stat-label">Total Buyers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '–' : vegCount}</div>
            <div className="stat-label">Vegetarian</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <UtensilsCrossed size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '–' : nonVegCount}</div>
            <div className="stat-label">Non-Vegetarian</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? '–' : buyers.length - vegCount - nonVegCount}
            </div>
            <div className="stat-label">Other / Unspecified</div>
          </div>
        </div>
      </div>

      {/* Recent buyers */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Buyers</h2>
          <span style={{ fontSize: 12, color: '#8892aa' }}>Latest 5</span>
        </div>
        <div className="card-body" style={{ paddingTop: 12 }}>
          {loading ? (
            <p style={{ color: '#8892aa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Loading…
            </p>
          ) : recentBuyers.length === 0 ? (
            <p style={{ color: '#8892aa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No buyers yet. Add your first buyer to get started.
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
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#f8f9fd',
                    border: '1px solid #eceef5',
                  }}
                >
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1a1f35', fontSize: 14, truncate: 'true' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#8892aa', marginTop: 1 }}>
                      {b.company} · {b.designation}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#b0b8d8', flexShrink: 0 }}>
                    {new Date(b.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
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
