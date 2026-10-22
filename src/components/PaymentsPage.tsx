import { useEffect, useState, useCallback } from 'react'
import { getBuyers } from '../services/buyerService'
import { confirmPaymentAndIssueTicket, sendBuyerTicketEmail } from '../services/ticketService'
import { sendBuyerTicketSms } from '../services/smsService'
import { getSettings } from '../services/emailService'
import { type Buyer } from '../lib/supabase'
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  SendHorizonal,
  Smartphone,
  QrCode,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TicketModal from './TicketModal'
import EditBuyerModal from './EditBuyerModal'
import { useAuth } from '../context/AuthContext'
import { extractPriceNumber } from '../utils/priceUtils'

export default function PaymentsPage() {
  const { isViewer, isSuperAdmin } = useAuth()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid'>('all')

  // Confirm Payment Dialog state
  const [confirmingBuyer, setConfirmingBuyer] = useState<Buyer | null>(null)
  const [payhereRefInput, setPayhereRefInput] = useState('')
  const [confirmPriceInput, setConfirmPriceInput] = useState('')
  const [sendTicketEmailOnConfirm, setSendTicketEmailOnConfirm] = useState(true)
  const [sendTicketSmsOnConfirm, setSendTicketSmsOnConfirm] = useState(false)
  const [confirmingLoading, setConfirmingLoading] = useState(false)

  // Edit Buyer Modal state (Super Admin)
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null)

  // Ticket Modal state
  const [selectedTicketBuyer, setSelectedTicketBuyer] = useState<Buyer | null>(null)
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null)
  const [sendingTicketSmsId, setSendingTicketSmsId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [buyersRes, settingsRes] = await Promise.all([getBuyers(), getSettings()])
    setLoading(false)

    if (buyersRes.data) setBuyers(buyersRes.data)
    if (settingsRes) setSettings(settingsRes)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered buyers
  const filteredBuyers = buyers.filter((b) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.mobile.includes(q) ||
      b.company.toLowerCase().includes(q) ||
      (b.ticket_number && b.ticket_number.toLowerCase().includes(q)) ||
      (b.payment_ref && b.payment_ref.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (filterTab === 'pending') return b.payment_status !== 'paid'
    if (filterTab === 'paid') return b.payment_status === 'paid'
    return true
  })

  // Statistics
  const totalPaid = buyers.filter((b) => b.payment_status === 'paid').length
  const totalPending = buyers.filter((b) => b.payment_status !== 'paid').length
  // Dynamic revenue: extract only numeric digits from each paid buyer's ticket_price (0 if null/text)
  const totalRevenue = buyers
    .filter((b) => b.payment_status === 'paid')
    .reduce((acc, b) => acc + extractPriceNumber(b.ticket_price), 0)

  async function handleConfirmPaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isViewer) {
      toast.error('View-only profile cannot confirm payments.')
      return
    }
    if (!confirmingBuyer) return

    setConfirmingLoading(true)
    const { success, ticket_number, error } = await confirmPaymentAndIssueTicket(
      confirmingBuyer.id,
      payhereRefInput.trim(),
      confirmingBuyer,
      sendTicketEmailOnConfirm,
      confirmPriceInput.trim() || undefined,
      sendTicketSmsOnConfirm
    )
    setConfirmingLoading(false)

    if (success) {
      const dispatched: string[] = []
      if (sendTicketEmailOnConfirm) dispatched.push('emailed')
      if (sendTicketSmsOnConfirm) dispatched.push('SMS sent')
      const extraMsg = dispatched.length > 0 ? ` (${dispatched.join(' + ')})` : ''
      toast.success(`Payment confirmed! Ticket ${ticket_number} generated${extraMsg}!`)
      setConfirmingBuyer(null)
      setPayhereRefInput('')
      setConfirmPriceInput('')
      loadData()
    } else {
      toast.error(`Confirmation failed: ${error}`)
    }
  }

  async function handleResendTicketEmail(buyer: Buyer) {
    if (isViewer) {
      toast.error('View-only profile cannot dispatch ticket emails.')
      return
    }
    setSendingTicketId(buyer.id)
    const { success, error } = await sendBuyerTicketEmail(buyer.id, buyer)
    setSendingTicketId(null)

    if (success) {
      toast.success(`E-Ticket sent to ${buyer.email}`)
      loadData()
    } else {
      toast.error(`Failed to send ticket: ${error}`)
    }
  }

  async function handleResendTicketSms(buyer: Buyer) {
    if (isViewer) {
      toast.error('View-only profile cannot dispatch ticket SMS.')
      return
    }
    if (!buyer.mobile || !buyer.mobile.trim()) {
      toast.error('Buyer does not have a mobile number.')
      return
    }
    setSendingTicketSmsId(buyer.id)
    const { success, error } = await sendBuyerTicketSms(buyer.id, buyer)
    setSendingTicketSmsId(null)

    if (success) {
      toast.success(`Ticket SMS sent to ${buyer.mobile}`)
      loadData()
    } else {
      toast.error(`Failed to send ticket SMS: ${error}`)
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payments & E-Tickets</h1>
          <p>Verify PayHere transactions, confirm payments, and issue digital passes</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="https://www.payhere.lk/account"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ExternalLink size={14} /> Open PayHere Dashboard
          </a>
          <button className="btn btn-primary" onClick={loadData}>
            <RefreshCw size={14} /> Refresh Records
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px' }}>
                Total Revenue
              </p>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                LKR {totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#15803d', marginTop: 10, fontWeight: 600 }}>
            {totalPaid} confirmed ticket{totalPaid !== 1 ? 's' : ''} sold
          </p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px' }}>
                Confirmed Tickets
              </p>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#15803d', margin: 0 }}>
                {totalPaid}
              </h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck2 size={20} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
            Official E-Tickets issued with QR codes
          </p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px' }}>
                Pending Verification
              </p>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#d97706', margin: 0 }}>
                {totalPending}
              </h3>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#b45309', marginTop: 10, fontWeight: 600 }}>
            Awaiting PayHere check
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Filter and Search Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eceef5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Tabs */}
          <div className="filter-tabs-scroll" style={{ background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
            <button
              onClick={() => setFilterTab('all')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: filterTab === 'all' ? '#ffffff' : 'transparent',
                color: filterTab === 'all' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              All Attendees ({buyers.length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: filterTab === 'pending' ? '#ffffff' : 'transparent',
                color: filterTab === 'pending' ? '#d97706' : '#64748b',
                boxShadow: filterTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Pending PayHere ({totalPending})
            </button>
            <button
              onClick={() => setFilterTab('paid')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: filterTab === 'paid' ? '#ffffff' : 'transparent',
                color: filterTab === 'paid' ? '#15803d' : '#64748b',
                boxShadow: filterTab === 'paid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Paid & Issued ({totalPaid})
            </button>
          </div>

          {/* Search */}
          <div className="search-bar" style={{ maxWidth: 320 }}>
            <Search className="search-icon" />
            <input
              type="search"
              placeholder="Search name, phone, ticket #, ref…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div className="spinner spinner-dark" style={{ width: 32, height: 32, margin: '0 auto 16px', border: '3px solid #dde0ec', borderTopColor: '#3b82f6' }} />
            <p style={{ color: '#8892aa', fontSize: 14 }}>Loading payment records…</p>
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={32} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <h3>No participants found</h3>
            <p>Try switching filter tabs or clearing your search keywords.</p>
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Attendee</th>
                  <th>Company & Position</th>
                  <th>Mobile</th>
                  <th>Payment Status</th>
                  <th>Ticket Fee</th>
                  <th>Ticket Number</th>
                  <th>PayHere Ref</th>
                  <th>Ticket Email</th>
                  <th>Ticket SMS</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map((buyer, idx) => {
                  const isPaid = buyer.payment_status === 'paid'
                  return (
                    <tr key={buyer.id}>
                      <td style={{ color: '#b0b8d8', fontSize: 12, fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{buyer.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{buyer.email}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{buyer.company}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{buyer.designation}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: '#334155' }}>{buyer.mobile}</span>
                      </td>
                      <td>
                        {isPaid ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 9px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} /> PAID
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '3px 9px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={12} /> UNPAID
                          </span>
                        )}
                      </td>
                      <td>
                        {buyer.ticket_price ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: 12.5,
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {buyer.ticket_price}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '2px 7px',
                              borderRadius: 6,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                            title="Price not yet set. Click Edit to assign."
                          >
                            Not Set
                          </span>
                        )}
                      </td>
                      <td>
                        {buyer.ticket_number ? (
                          <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 7px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                            {buyer.ticket_number}
                          </code>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {buyer.payment_ref ? (
                          <span style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                            {buyer.payment_ref}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {buyer.ticket_email_status === 'sent' ? (
                          <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Emailed
                          </span>
                        ) : buyer.ticket_email_status === 'sending' ? (
                          <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>Sending…</span>
                        ) : buyer.ticket_email_status === 'failed' ? (
                          <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }} title={buyer.ticket_email_error || ''}>
                            <AlertCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Not Sent</span>
                        )}
                      </td>
                      <td>
                        {buyer.ticket_sms_status === 'sent' ? (
                          <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> SMS Sent
                          </span>
                        ) : buyer.ticket_sms_status === 'sending' || sendingTicketSmsId === buyer.id ? (
                          <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>Sending…</span>
                        ) : buyer.ticket_sms_status === 'failed' ? (
                          <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }} title={buyer.ticket_sms_error || 'Ticket SMS delivery failed'}>
                            <AlertCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Not Sent</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap' }}>
                          {!isPaid ? (
                            isViewer ? (
                              <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
                            ) : (
                              <>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => {
                                    setConfirmingBuyer(buyer)
                                    setPayhereRefInput('')
                                    setConfirmPriceInput(buyer.ticket_price || settings.ticket_price || 'LKR 3,500')
                                  }}
                                  style={{ padding: '4px 10px', fontSize: 11.5, fontWeight: 700 }}
                                >
                                  Confirm Paid
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setEditingBuyer(buyer)}
                                    style={{ padding: '4px 7px', color: '#4f46e5' }}
                                    title="Edit attendee details and custom price"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
                              </>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setSelectedTicketBuyer(buyer)}
                                style={{ padding: '4px 7px', fontSize: 11.5 }}
                                title="View and Print Digital E-Ticket Pass"
                              >
                                <QrCode size={13} /> Pass
                              </button>
                              {!isViewer && (
                                <>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleResendTicketEmail(buyer)}
                                    disabled={sendingTicketId === buyer.id}
                                    style={{ padding: '4px 7px', fontSize: 11.5 }}
                                    title={buyer.ticket_email_status === 'sent' ? 'Resend ticket email' : 'Send ticket email'}
                                  >
                                    {sendingTicketId === buyer.id ? (
                                      <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                                    ) : (
                                      <SendHorizonal size={12} />
                                    )}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleResendTicketSms(buyer)}
                                    disabled={sendingTicketSmsId === buyer.id}
                                    style={{ padding: '4px 7px', fontSize: 11.5 }}
                                    title={buyer.ticket_sms_status === 'sent' ? 'Resend ticket SMS' : 'Send ticket SMS'}
                                  >
                                    {sendingTicketSmsId === buyer.id ? (
                                      <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                                    ) : (
                                      <Smartphone size={12} />
                                    )}
                                  </button>
                                </>
                              )}
                              {isSuperAdmin && (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setEditingBuyer(buyer)}
                                  style={{ padding: '4px 7px', color: '#4f46e5' }}
                                  title="Edit attendee details and custom price"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Payment Modal Dialog */}
      {confirmingBuyer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setConfirmingBuyer(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
            className="fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Confirm PayHere Payment
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  This will generate the ticket & automatically email the E-Ticket pass.
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, margin: '16px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{confirmingBuyer.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{confirmingBuyer.email} &bull; {confirmingBuyer.mobile}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{confirmingBuyer.company} &bull; {confirmingBuyer.designation}</div>
            </div>

            <form onSubmit={handleConfirmPaymentSubmit}>
              <div className="form-group">
                <label className="form-label">PayHere Payment ID / Transaction Ref (Optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. 12003450 or PayHere Online"
                  value={payhereRefInput}
                  onChange={(e) => setPayhereRefInput(e.target.value)}
                  autoFocus
                />
                <p className="form-hint">Reference number from your PayHere merchant dashboard.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Ticket Price / Fee (Text)</label>
                <input
                  className="form-control"
                  placeholder="e.g. LKR 3,500 or USD 50 or Complimentary"
                  value={confirmPriceInput}
                  onChange={(e) => setConfirmPriceInput(e.target.value)}
                />
                <p className="form-hint">
                  Custom price printed on ticket. Numbers will be parsed for total revenue.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <input
                    type="checkbox"
                    id="send_ticket_confirm_pay"
                    checked={sendTicketEmailOnConfirm}
                    onChange={(e) => setSendTicketEmailOnConfirm(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="send_ticket_confirm_pay" style={{ fontSize: 12.5, color: '#166534', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                    Email official E-Ticket pass to buyer immediately
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <input
                    type="checkbox"
                    id="send_ticket_sms_confirm_pay"
                    checked={sendTicketSmsOnConfirm}
                    onChange={(e) => setSendTicketSmsOnConfirm(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="send_ticket_sms_confirm_pay" style={{ fontSize: 12.5, color: '#166534', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                    Send official Ticket Confirmation SMS to buyer mobile immediately
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmingBuyer(null)}
                  disabled={confirmingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={confirmingLoading}
                  style={{ minWidth: 140 }}
                >
                  {confirmingLoading ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Issuing Ticket…</>
                  ) : (
                    sendTicketEmailOnConfirm ? 'Confirm & Send Ticket' : 'Confirm & Issue Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Edit Buyer Modal */}
      {editingBuyer && (
        <EditBuyerModal
          buyer={editingBuyer}
          eventSettings={settings}
          onClose={() => setEditingBuyer(null)}
          onSaved={(updated) => {
            setBuyers((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            setEditingBuyer(null)
          }}
        />
      )}

      {/* Ticket Modal */}
      {selectedTicketBuyer && (
        <TicketModal
          buyer={selectedTicketBuyer}
          eventSettings={settings}
          onClose={() => setSelectedTicketBuyer(null)}
          onTicketSent={loadData}
        />
      )}
    </div>
  )
}
