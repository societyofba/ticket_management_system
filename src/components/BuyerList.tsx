import { useEffect, useState, useCallback } from 'react'
import { getBuyers, deleteBuyer, searchBuyers } from '../services/buyerService'
import { sendBuyerEmail } from '../services/emailService'
import { sendBuyerSms } from '../services/smsService'
import { type Buyer } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Search,
  UserPlus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  MailCheck,
  MailX,
  SendHorizonal,
  MessageCircle,
  Smartphone,
  QrCode,
  Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TicketModal from './TicketModal'
import { getSettings } from '../services/emailService'

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
  const { canDeleteBuyers } = useAuth()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedTicketBuyer, setSelectedTicketBuyer] = useState<Buyer | null>(null)
  const [settings, setSettings] = useState<Record<string, string>>({})

  const loadBuyers = useCallback(async () => {
    setLoading(true)
    const [bRes, sRes] = await Promise.all([getBuyers(), getSettings()])
    setLoading(false)
    if (bRes.error) {
      toast.error(`Failed to load buyers: ${bRes.error}`)
      return
    }
    setBuyers(bRes.data ?? [])
    if (sRes) setSettings(sRes)
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
      if (!error) setBuyers(data ?? [])
    }, 300)
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
    let valA = a[sortField] ?? ''
    let valB = b[sortField] ?? ''
    if (sortField === 'created_at') {
      return sortDir === 'asc'
        ? new Date(valA).getTime() - new Date(valB).getTime()
        : new Date(valB).getTime() - new Date(valA).getTime()
    }
    if (sortDir === 'asc') return valA.localeCompare(valB)
    return valB.localeCompare(valA)
  })

  async function handleDelete(buyer: Buyer) {
    if (!canDeleteBuyers) {
      toast.error('Permission Denied: Only Super Admin can delete buyer records.')
      return
    }
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

  async function handleSendSms(buyer: Buyer) {
    setSendingSmsId(buyer.id)
    const { success, error } = await sendBuyerSms(buyer.id, buyer)
    setSendingSmsId(null)
    if (success) {
      toast.success(`SMS sent to ${buyer.mobile} via SMSlenz!`)
      setBuyers((prev) =>
        prev.map((b) =>
          b.id === buyer.id
            ? { ...b, sms_status: 'sent', sms_sent_at: new Date().toISOString(), sms_error: null }
            : b
        )
      )
    } else {
      toast.error(`SMS failed: ${error ?? 'Unknown error'}`)
      setBuyers((prev) =>
        prev.map((b) =>
          b.id === buyer.id ? { ...b, sms_status: 'failed', sms_error: error ?? null } : b
        )
      )
    }
  }

  function openWhatsApp(buyer: Buyer) {
    const rawNumber = buyer.mobile.replace(/[\s\-\(\)\+]/g, '')
    const phone = rawNumber.startsWith('0') ? '94' + rawNumber.slice(1) : rawNumber.startsWith('94') ? rawNumber : '94' + rawNumber
    const text = encodeURIComponent(`Hi ${buyer.name}, you are eligible to participate in CBA Forum 2026. Location: Waters Edge Hotel. Time: 3:00 PM - 7:00 PM. Ticket: LKR 3,000. Book seat: https://pay.cbaforum.lk`)
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
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
            {buyers.length} registered participant{buyers.length !== 1 ? 's' : ''} for CBA Forum
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
                  <th>SMS (SMSlenz)</th>
                  <th
                    onClick={() => handleSort('created_at')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Added <SortIcon field="created_at" />
                    </span>
                  </th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBuyers.map((buyer, idx) => (
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
                    {/* SMS status cell */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <SmsStatusBadge
                        status={buyer.sms_status ?? 'not_sent'}
                        sentAt={buyer.sms_sent_at}
                        error={buyer.sms_error}
                        isSending={sendingSmsId === buyer.id}
                        onSend={() => handleSendSms(buyer)}
                      />
                    </td>
                    <td style={{ fontSize: 12, color: '#8892aa' }}>
                      {formatDate(buyer.created_at)}
                    </td>
                      <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {buyer.payment_status === 'paid' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '5px 8px', color: '#2563eb' }}
                            onClick={() => setSelectedTicketBuyer(buyer)}
                            title={`View E-Ticket: ${buyer.ticket_number || ''}`}
                          >
                            <QrCode size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '5px 8px', color: '#16a34a' }}
                          onClick={() => openWhatsApp(buyer)}
                          title="Open WhatsApp chat with pre-filled ticket message"
                        >
                          <MessageCircle size={14} />
                        </button>
                        {canDeleteBuyers ? (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ padding: '5px 8px' }}
                            onClick={() => handleDelete(buyer)}
                            disabled={deletingId === buyer.id}
                            title="Delete buyer record (Super Admin only)"
                          >
                            {deletingId === buyer.id ? (
                              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{
                              padding: '5px 8px',
                              background: '#f1f5f9',
                              color: '#94a3b8',
                              border: '1px solid #e2e8f0',
                              cursor: 'not-allowed',
                              opacity: 0.75,
                            }}
                            onClick={() =>
                              toast.error('Permission Denied: Only Super Admin can delete buyer records.')
                            }
                            title="Delete restricted (Super Admin only)"
                          >
                            <Lock size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {selectedTicketBuyer && (
        <TicketModal
          buyer={selectedTicketBuyer}
          eventSettings={settings}
          onClose={() => setSelectedTicketBuyer(null)}
          onTicketSent={loadBuyers}
        />
      )}
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
          <span style={{ fontSize: 10, color: '#ef4444', maxWidth: 130, wordBreak: 'break-word' }}>
            {error.slice(0, 50)}{error.length > 50 ? '…' : ''}
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

function SmsStatusBadge({
  status,
  sentAt,
  error,
  isSending,
  onSend,
}: {
  status: string
  sentAt: string | null
  error: string | null
  isSending: boolean
  onSend: () => void
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
        Sending SMS…
      </span>
    )
  }

  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="badge badge-green" title={`SMS sent at ${formatShort(sentAt)}`}>
          <Smartphone size={11} /> Sent
        </span>
        {sentAt && (
          <span style={{ fontSize: 10, color: '#b0b8d8' }}>{formatShort(sentAt)}</span>
        )}
        <button
          className="btn btn-sm btn-secondary"
          style={{ padding: '2px 7px', fontSize: 11, marginTop: 2 }}
          onClick={onSend}
          title="Resend SMS"
        >
          <SendHorizonal size={10} /> Resend
        </button>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="badge badge-red" title={error ?? 'SMS failed'}>
          <Smartphone size={11} /> Failed
        </span>
        {error && (
          <span style={{ fontSize: 10, color: '#ef4444', maxWidth: 130, wordBreak: 'break-word' }}>
            {error.slice(0, 50)}{error.length > 50 ? '…' : ''}
          </span>
        )}
        <button
          className="btn btn-sm btn-primary"
          style={{ padding: '2px 8px', fontSize: 11, marginTop: 2 }}
          onClick={onSend}
        >
          <SendHorizonal size={10} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="badge badge-gray">
        <Smartphone size={11} /> Not Sent
      </span>
      <button
        className="btn btn-sm btn-primary"
        style={{ padding: '3px 8px', fontSize: 11 }}
        onClick={onSend}
      >
        <SendHorizonal size={10} /> Send SMS
      </button>
    </div>
  )
}
