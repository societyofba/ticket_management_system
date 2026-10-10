import { useEffect, useState, useCallback } from 'react'
import { getBuyers, deleteBuyer, searchBuyers } from '../services/buyerService'
import { sendBuyerEmail } from '../services/emailService'
import { type Buyer } from '../lib/supabase'
import {
  Search,
  RefreshCw,
  UserPlus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  MailCheck,
  MailX,
  Phone,
  Building2,
  Briefcase,
  UtensilsCrossed,
  SendHorizonal,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BuyerListProps {
  onAddBuyer: () => void
  refreshTrigger?: number
}

const MEAL_LABELS: Record<string, string> = {
  non_vegetarian: '🍖 Non-Veg',
  vegetarian: '🥦 Vegetarian',
  other: '🍽️ Other',
}

const MEAL_BADGE: Record<string, string> = {
  non_vegetarian: 'badge-blue',
  vegetarian: 'badge-green',
  other: 'badge-gray',
}

type SortField = 'name' | 'email' | 'company' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function BuyerList({ onAddBuyer, refreshTrigger }: BuyerListProps) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadBuyers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getBuyers()
    setLoading(false)
    if (error) {
      toast.error(`Failed to load buyers: ${error}`)
      return
    }
    setBuyers(data ?? [])
  }, [])

  useEffect(() => {
    loadBuyers()
  }, [loadBuyers, refreshTrigger])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadBuyers()
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data, error } = await searchBuyers(searchQuery)
      setLoading(false)
      if (error) {
        toast.error(`Search failed: ${error}`)
        return
      }
      setBuyers(data ?? [])
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery, loadBuyers])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedBuyers = [...buyers].sort((a, b) => {
    let valA: string = a[sortField] ?? ''
    let valB: string = b[sortField] ?? ''
    if (sortDir === 'asc') return valA.localeCompare(valB)
    return valB.localeCompare(valA)
  })

  async function handleDelete(buyer: Buyer) {
    if (!confirm(`Delete buyer "${buyer.name}"? This cannot be undone.`)) return
    setDeletingId(buyer.id)
    const { error } = await deleteBuyer(buyer.id)
    setDeletingId(null)
    if (error) {
      toast.error(`Delete failed: ${error}`)
      return
    }
    toast.success(`"${buyer.name}" removed.`)
    setBuyers((prev) => prev.filter((b) => b.id !== buyer.id))
  }

  async function handleResendEmail(buyer: Buyer) {
    setSendingEmailId(buyer.id)
    const { success, error } = await sendBuyerEmail(buyer.id, buyer)
    setSendingEmailId(null)
    if (success) {
      toast.success(`Email sent to ${buyer.email}`)
      // Update local state
      setBuyers((prev) =>
        prev.map((b) =>
          b.id === buyer.id
            ? { ...b, email_status: 'sent', email_sent_at: new Date().toISOString(), email_error: null }
            : b
        )
      )
    } else {
      toast.error(`Email failed: ${error ?? 'Unknown error'}`)
      setBuyers((prev) =>
        prev.map((b) =>
          b.id === buyer.id ? { ...b, email_status: 'failed', email_error: error ?? null } : b
        )
      )
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>All Buyers</h1>
          <p>
            {loading ? 'Loading…' : `${buyers.length} buyer${buyers.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadBuyers} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={onAddBuyer}>
            <UserPlus size={15} />
            Add Buyer
          </button>
        </div>
      </div>

      <div className="card">
        {/* Search bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eceef5',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div className="search-bar">
            <Search className="search-icon" />
            <input
              type="search"
              placeholder="Search by name, email, mobile, company…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: '#b0b8d8', marginLeft: 'auto' }}>
            {sortedBuyers.length} result{sortedBuyers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div
              className="spinner spinner-dark"
              style={{ width: 32, height: 32, margin: '0 auto 16px', border: '3px solid #dde0ec', borderTopColor: '#3b82f6' }}
            />
            <p style={{ color: '#8892aa', fontSize: 14 }}>Loading buyers…</p>
          </div>
        ) : sortedBuyers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={28} />
            </div>
            <h3>{searchQuery ? 'No buyers match your search' : 'No buyers yet'}</h3>
            <p>
              {searchQuery
                ? 'Try different keywords or clear the search.'
                : 'Get started by adding your first buyer.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={onAddBuyer}>
                <UserPlus size={15} />
                Add First Buyer
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th
                    onClick={() => handleSort('name')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Name <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Email <SortIcon field="email" />
                    </span>
                  </th>
                  <th>Mobile</th>
                  <th
                    onClick={() => handleSort('company')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Company <SortIcon field="company" />
                    </span>
                  </th>
                  <th>Designation</th>
                  <th>Meal</th>
                  <th>Email Status</th>
                  <th
                    onClick={() => handleSort('created_at')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Added <SortIcon field="created_at" />
                    </span>
                  </th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedBuyers.map((buyer, idx) => (
                  <>
                    <tr
                      key={buyer.id}
                      onClick={() => setExpandedId(expandedId === buyer.id ? null : buyer.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: '#b0b8d8', fontSize: 12, fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: `hsl(${(buyer.name.charCodeAt(0) * 37) % 360}, 65%, 92%)`,
                              color: `hsl(${(buyer.name.charCodeAt(0) * 37) % 360}, 65%, 35%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {buyer.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: '#1a1f35' }}>{buyer.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#4b5a8a', fontSize: 13 }}>{buyer.email}</span>
                      </td>
                      <td>
                        <span style={{ color: '#4b5a8a', fontSize: 13 }}>{buyer.mobile}</span>
                      </td>
                      <td>
                        <span style={{ color: '#2c3358', fontWeight: 500 }}>{buyer.company}</span>
                      </td>
                      <td>
                        <span style={{ color: '#4b5a8a', fontSize: 13 }}>{buyer.designation}</span>
                      </td>
                      <td>
                        <span className={`badge ${MEAL_BADGE[buyer.meal_preference] ?? 'badge-gray'}`}>
                          {MEAL_LABELS[buyer.meal_preference] ?? buyer.meal_preference}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#8892aa' }}>
                        {formatDate(buyer.created_at)}
                      </td>
                      {/* Email status cell */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <EmailStatusBadge
                          status={buyer.email_status}
                          sentAt={buyer.email_sent_at}
                          error={buyer.email_error}
                          isSending={sendingEmailId === buyer.id}
                          onResend={() => handleResendEmail(buyer)}
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '5px 10px' }}
                          onClick={() => handleDelete(buyer)}
                          disabled={deletingId === buyer.id}
                          title="Delete buyer"
                        >
                          {deletingId === buyer.id ? (
                            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {expandedId === buyer.id && (
                      <tr key={`${buyer.id}-details`}>
                        <td colSpan={10} style={{ background: '#f8faff', padding: 0 }}>
                          <div
                            style={{
                              padding: '16px 20px 16px 58px',
                              display: 'flex',
                              gap: 32,
                              flexWrap: 'wrap',
                            }}
                          >
                            <DetailItem icon={<Mail size={13} />} label="Email" value={buyer.email} />
                            <DetailItem icon={<Phone size={13} />} label="Mobile" value={buyer.mobile} />
                            <DetailItem icon={<Building2 size={13} />} label="Company" value={buyer.company} />
                            <DetailItem icon={<Briefcase size={13} />} label="Designation" value={buyer.designation} />
                            <DetailItem
                              icon={<UtensilsCrossed size={13} />}
                              label="Meal"
                              value={MEAL_LABELS[buyer.meal_preference] ?? buyer.meal_preference}
                            />
                            {buyer.meal_notes && (
                              <DetailItem icon={null} label="Meal Notes" value={buyer.meal_notes} />
                            )}
                            {buyer.special_notes && (
                              <DetailItem icon={null} label="Special Notes" value={buyer.special_notes} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div style={{ minWidth: 140 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: '#b0b8d8',
          marginBottom: 3,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: '#2c3358', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function EmailStatusBadge({
  status,
  sentAt,
  error,
  isSending,
  onResend,
}: {
  status: string
  sentAt: string | null
  error: string | null
  isSending: boolean
  onResend: () => void
}) {
  function formatShort(dt: string | null) {
    if (!dt) return ''
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  if (isSending) {
    return (
      <span className="badge badge-blue" style={{ gap: 5 }}>
        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5, borderColor: 'rgba(29,78,216,0.3)', borderTopColor: '#1d4ed8' }} />
        Sending…
      </span>
    )
  }

  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="badge badge-green" title={`Sent at ${formatShort(sentAt)}`}>
          <MailCheck size={11} /> Sent
        </span>
        {sentAt && (
          <span style={{ fontSize: 10, color: '#b0b8d8' }}>{formatShort(sentAt)}</span>
        )}
        <button
          className="btn btn-sm btn-secondary"
          style={{ padding: '2px 7px', fontSize: 11, marginTop: 2 }}
          onClick={onResend}
          title="Resend email"
        >
          <SendHorizonal size={10} /> Resend
        </button>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="badge badge-red" title={error ?? 'Email failed'}>
          <MailX size={11} /> Failed
        </span>
        {error && (
          <span style={{ fontSize: 10, color: '#ef4444', maxWidth: 140, wordBreak: 'break-word' }}>
            {error.slice(0, 60)}{error.length > 60 ? '…' : ''}
          </span>
        )}
        <button
          className="btn btn-sm btn-primary"
          style={{ padding: '2px 8px', fontSize: 11, marginTop: 2 }}
          onClick={onResend}
        >
          <SendHorizonal size={10} /> Retry
        </button>
      </div>
    )
  }

  // not_sent or sending (stuck)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="badge badge-gray">
        <Mail size={11} /> Not Sent
      </span>
      <button
        className="btn btn-sm btn-primary"
        style={{ padding: '3px 8px', fontSize: 11 }}
        onClick={onResend}
      >
        <SendHorizonal size={10} /> Send
      </button>
    </div>
  )
}

