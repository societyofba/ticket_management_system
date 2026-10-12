import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getCheckedInBuyers,
  getCheckInStats,
  undoCheckIn,
  manualCheckIn,
} from '../services/checkInService'
import { getBuyers } from '../services/buyerService'
import { type Buyer } from '../lib/supabase'
import {
  CheckSquare,
  Clock,
  Users,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  RotateCcw,
  Wifi,
  WifiOff,
  BarChart3,
  CircleDot,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const POLL_INTERVAL_MS = 5000

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function timeSince(iso: string | null): string {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
}

export default function CheckInPage() {
  const { isViewer } = useAuth()
  const [checkedInBuyers, setCheckedInBuyers] = useState<Buyer[]>([])
  const [allPaidBuyers, setAllPaidBuyers] = useState<Buyer[]>([])
  const [stats, setStats] = useState({ totalPaid: 0, checkedIn: 0, notYetArrived: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pollingActive, setPollingActive] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'checked_in' | 'not_yet'>('checked_in')
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [secondsToNext, setSecondsToNext] = useState(5)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    const [checkedInRes, statsRes, allRes] = await Promise.all([
      getCheckedInBuyers(),
      getCheckInStats(),
      getBuyers(),
    ])

    if (!checkedInRes.error) setCheckedInBuyers(checkedInRes.data)
    if (!statsRes.error) setStats({ totalPaid: statsRes.totalPaid, checkedIn: statsRes.checkedIn, notYetArrived: statsRes.notYetArrived })
    if (!allRes.error && allRes.data) {
      setAllPaidBuyers(allRes.data.filter((b) => b.payment_status === 'paid'))
    }

    setLastUpdated(new Date())
    setLoading(false)
    setSecondsToNext(POLL_INTERVAL_MS / 1000)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!pollingActive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      fetchData()
    }, POLL_INTERVAL_MS)

    countdownRef.current = setInterval(() => {
      setSecondsToNext((prev) => {
        if (prev <= 1) return POLL_INTERVAL_MS / 1000
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [pollingActive, fetchData])

  async function handleUndoCheckIn(buyer: Buyer) {
    if (isViewer) {
      toast.error('View-only profile cannot modify check-in records.')
      return
    }
    if (!confirm(`Remove check-in for "${buyer.name}"?`)) return
    setUndoingId(buyer.id)
    const { error } = await undoCheckIn(buyer.id)
    setUndoingId(null)
    if (error) {
      toast.error(`Failed: ${error}`)
    } else {
      toast.success(`Check-in removed for ${buyer.name}`)
      fetchData()
    }
  }

  async function handleManualCheckIn(buyer: Buyer) {
    if (isViewer) {
      toast.error('View-only profile cannot perform check-ins.')
      return
    }
    setCheckingInId(buyer.id)
    const { error } = await manualCheckIn(buyer.id)
    setCheckingInId(null)
    if (error) {
      toast.error(`Failed: ${error}`)
    } else {
      toast.success(`✅ ${buyer.name} marked as arrived!`)
      fetchData()
    }
  }

  const filteredCheckedIn = checkedInBuyers.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.ticket_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const notYetArrived = allPaidBuyers.filter((b) => !b.checked_in)
  const filteredNotYet = notYetArrived.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.ticket_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const arrivalPercent = stats.totalPaid > 0 ? Math.round((stats.checkedIn / stats.totalPaid) * 100) : 0

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <RefreshCw size={24} style={{ color: '#b0b8d8', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#8892aa', marginTop: 12 }}>Loading check-in data…</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Event Day Check-In</h1>
          <p>Real-time arrival tracking for CBA Forum 2026</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live polling indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: pollingActive ? 'rgba(22, 163, 74, 0.08)' : 'rgba(100,116,139,0.1)',
              border: pollingActive ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {pollingActive ? (
              <>
                <CircleDot size={12} color="#16a34a" style={{ animation: 'pulse 1.5s infinite' }} />
                <span style={{ color: '#15803d' }}>Live · Refreshing in {secondsToNext}s</span>
              </>
            ) : (
              <>
                <WifiOff size={12} color="#94a3b8" />
                <span style={{ color: '#64748b' }}>Paused</span>
              </>
            )}
          </div>

          {!isViewer && (
            <>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setPollingActive((p) => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {pollingActive ? <WifiOff size={14} /> : <Wifi size={14} />}
                {pollingActive ? 'Pause' : 'Resume'}
              </button>

              <button
                className="btn btn-sm btn-secondary"
                onClick={fetchData}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} />
                Refresh Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Dashboard Stats ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '20px 24px', textAlign: 'center', borderTop: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e3a8a' }}>{stats.totalPaid}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>
            Total Ticket Holders
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
            <Users size={13} /> Paid & Confirmed
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', textAlign: 'center', borderTop: '4px solid #16a34a' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#14532d' }}>{stats.checkedIn}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>
            Arrived & Checked In
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                height: 6,
                background: '#dcfce7',
                borderRadius: 99,
                overflow: 'hidden',
                maxWidth: 120,
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${arrivalPercent}%`,
                  background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>{arrivalPercent}% arrival rate</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#78350f' }}>{stats.notYetArrived}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>
            Not Yet Arrived
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
            <Clock size={13} /> Expected to arrive
          </div>
        </div>
      </div>

      {/* ── Live Arrivals Feed + Not Arrived Tab ─────────────── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid #e8eaf2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Tabs */}
            <button
              onClick={() => setActiveTab('checked_in')}
              style={{
                background: activeTab === 'checked_in' ? '#3b82f6' : 'transparent',
                color: activeTab === 'checked_in' ? '#ffffff' : '#64748b',
                border: activeTab === 'checked_in' ? 'none' : '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <UserCheck size={14} />
              Arrived ({stats.checkedIn})
            </button>
            <button
              onClick={() => setActiveTab('not_yet')}
              style={{
                background: activeTab === 'not_yet' ? '#f59e0b' : 'transparent',
                color: activeTab === 'not_yet' ? '#ffffff' : '#64748b',
                border: activeTab === 'not_yet' ? 'none' : '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <UserX size={14} />
              Not Yet ({stats.notYetArrived})
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search name, ticket, company…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {lastUpdated && (
            <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              <BarChart3 size={11} style={{ display: 'inline', marginRight: 4 }} />
              Updated {formatTime(lastUpdated.toISOString())}
            </div>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {activeTab === 'checked_in' && (
            <>
              {filteredCheckedIn.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <CheckSquare size={36} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 14 }}>
                    {searchQuery ? 'No arrivals match your search.' : 'No check-ins yet. The Expo scanner app will update this list.'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8eaf2' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Attendee</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Ticket #</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Arrived At</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Meal</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>{isViewer ? 'Status' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCheckedIn.map((buyer, idx) => (
                      <tr
                        key={buyer.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafcff',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{buyer.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{buyer.company}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ background: '#f0f4ff', color: '#2563eb', padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 700 }}>
                            {buyer.ticket_number || '—'}
                          </code>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{formatTime(buyer.checked_in_at)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeSince(buyer.checked_in_at)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontWeight: 600,
                              background: buyer.meal_preference === 'vegetarian' ? '#f0fdf4' : '#fff7ed',
                              color: buyer.meal_preference === 'vegetarian' ? '#16a34a' : '#c2410c',
                              border: `1px solid ${buyer.meal_preference === 'vegetarian' ? '#bbf7d0' : '#fed7aa'}`,
                            }}
                          >
                            {buyer.meal_preference === 'vegetarian' ? '🥦 Veg' : buyer.meal_preference === 'non_vegetarian' ? '🍖 Non-Veg' : '🍽 Other'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {isViewer ? (
                            <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={13} /> Present
                            </span>
                          ) : (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: 11, padding: '4px 10px', color: '#dc2626' }}
                              onClick={() => handleUndoCheckIn(buyer)}
                              disabled={undoingId === buyer.id}
                              title="Remove check-in (undo)"
                            >
                              {undoingId === buyer.id ? (
                                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                              ) : (
                                <>
                                  <RotateCcw size={12} style={{ marginRight: 4 }} />
                                  Undo
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'not_yet' && (
            <>
              {filteredNotYet.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <UserCheck size={36} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block', color: '#16a34a' }} />
                  <p style={{ margin: 0, fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
                    {searchQuery ? 'No attendees match your search.' : '🎉 All ticket holders have checked in!'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8eaf2' }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Attendee</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Ticket #</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Contact</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Meal</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>{isViewer ? 'Status' : 'Manual Check-In'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotYet.map((buyer, idx) => (
                      <tr
                        key={buyer.id}
                        style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafcff' }}
                      >
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{buyer.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{buyer.company}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ background: '#f0f4ff', color: '#2563eb', padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 700 }}>
                            {buyer.ticket_number || '—'}
                          </code>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 12, color: '#334155' }}>{buyer.mobile}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{buyer.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontWeight: 600,
                              background: buyer.meal_preference === 'vegetarian' ? '#f0fdf4' : '#fff7ed',
                              color: buyer.meal_preference === 'vegetarian' ? '#16a34a' : '#c2410c',
                              border: `1px solid ${buyer.meal_preference === 'vegetarian' ? '#bbf7d0' : '#fed7aa'}`,
                            }}
                          >
                            {buyer.meal_preference === 'vegetarian' ? '🥦 Veg' : buyer.meal_preference === 'non_vegetarian' ? '🍖 Non-Veg' : '🍽 Other'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {isViewer ? (
                            <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>Pending Arrival</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: 11, padding: '5px 12px' }}
                              onClick={() => handleManualCheckIn(buyer)}
                              disabled={checkingInId === buyer.id}
                              title="Mark as arrived manually"
                            >
                              {checkingInId === buyer.id ? (
                                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                              ) : (
                                <>
                                  <CheckSquare size={12} style={{ marginRight: 4 }} />
                                  Mark Arrived
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
