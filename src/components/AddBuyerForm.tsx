import { useState, useEffect } from 'react'
import { createBuyer } from '../services/buyerService'
import { sendBuyerEmail, getSettings } from '../services/emailService'
import { sendBuyerTicketEmail, generateTicketNumber } from '../services/ticketService'
import { type Buyer, type BuyerInsert } from '../lib/supabase'
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Lock,
  QrCode,
  SendHorizonal,
  Clock,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import TicketModal from './TicketModal'

interface AddBuyerFormProps {
  onSuccess?: () => void
  onNavigateToBuyers?: () => void
}

const MEAL_OPTIONS = [
  { value: 'non_vegetarian', label: '🍖 Non-Veg' },
  { value: 'vegetarian', label: '🥦 Veg' },
  { value: 'other', label: '🍽️ Other' },
] as const

type MealPreference = 'vegetarian' | 'non_vegetarian' | 'other'

interface FormData {
  name: string
  email: string
  mobile: string
  company: string
  designation: string
  meal_preference: MealPreference
  meal_notes: string
  special_notes: string
}

interface FormErrors {
  name?: string
  email?: string
  mobile?: string
  company?: string
  designation?: string
  meal_preference?: string
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateMobile(mobile: string): boolean {
  return /^[\d\s+\-()]{7,15}$/.test(mobile.trim())
}

export default function AddBuyerForm({ onSuccess, onNavigateToBuyers }: AddBuyerFormProps) {
  const { isViewer } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobile: '',
    company: '',
    designation: '',
    meal_preference: 'non_vegetarian',
    meal_notes: '',
    special_notes: '',
  })

  // Payment status & manual email dispatch options
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid')
  const [paymentRef, setPaymentRef] = useState('')

  // Success screen states
  const [createdBuyer, setCreatedBuyer] = useState<Buyer | null>(null)
  const [sendingTicket, setSendingTicket] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [eventSettings, setEventSettings] = useState<Record<string, string>>({})

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getSettings().then((res) => {
      if (res) setEventSettings(res)
    })
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Full name is required.'
    else if (formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters.'

    if (!formData.email.trim()) newErrors.email = 'Email address is required.'
    else if (!validateEmail(formData.email)) newErrors.email = 'Enter a valid email address.'

    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required.'
    else if (!validateMobile(formData.mobile)) newErrors.mobile = 'Enter a valid mobile number.'

    if (!formData.company.trim()) newErrors.company = 'Company/Organization is required.'
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required.'
    if (!formData.meal_preference) newErrors.meal_preference = 'Please select a meal preference.'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isViewer) {
      toast.error('View-only profile cannot register buyers.')
      return
    }
    if (!validate()) return

    setSubmitting(true)

    const isPaid = paymentStatus === 'paid'
    const generatedTicket = isPaid ? generateTicketNumber(formData.name) : null
    const now = new Date().toISOString()

    const payload: BuyerInsert = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile.trim(),
      company: formData.company.trim(),
      designation: formData.designation.trim(),
      meal_preference: formData.meal_preference,
      meal_notes: formData.meal_notes.trim() || null,
      special_notes: formData.special_notes.trim() || null,
      payment_status: isPaid ? 'paid' : 'unpaid',
      payment_confirmed_at: isPaid ? now : null,
      payment_ref: isPaid ? (paymentRef.trim() || 'PayHere Confirmed') : null,
      ticket_number: generatedTicket,
      email_status: 'not_sent',
      ticket_email_status: 'not_sent',
    }

    const { data, error } = await createBuyer(payload)
    setSubmitting(false)

    if (error) {
      toast.error(`Failed to add buyer: ${error}`)
      return
    }

    if (isPaid) {
      toast.success(`Buyer registered! Ticket ${generatedTicket} issued.`)
    } else {
      toast.success('Buyer registered successfully!')
    }

    setCreatedBuyer(data || null)
    setSubmitted(true)
    onSuccess?.()
  }

  async function handleManualSendTicketEmail() {
    if (!createdBuyer) return
    setSendingTicket(true)
    const res = await sendBuyerTicketEmail(createdBuyer.id, createdBuyer)
    setSendingTicket(false)
    if (res.success) {
      toast.success(`Official E-Ticket sent to ${createdBuyer.email}!`)
      setCreatedBuyer((prev) => (prev ? { ...prev, ticket_email_status: 'sent' } : null))
    } else {
      toast.error(`Ticket email failed: ${res.error || 'Unknown error'}`)
    }
  }

  async function handleManualSendInviteEmail() {
    if (!createdBuyer) return
    setSendingInvite(true)
    const res = await sendBuyerEmail(createdBuyer.id, createdBuyer)
    setSendingInvite(false)
    if (res.success) {
      toast.success(`Invitation & payment link sent to ${createdBuyer.email}!`)
      setCreatedBuyer((prev) => (prev ? { ...prev, email_status: 'sent' } : null))
    } else {
      toast.error(`Invitation email failed: ${res.error || 'Unknown error'}`)
    }
  }

  function handleAddAnother() {
    setFormData({
      name: '',
      email: '',
      mobile: '',
      company: '',
      designation: '',
      meal_preference: 'non_vegetarian',
      meal_notes: '',
      special_notes: '',
    })
    setErrors({})
    setPaymentStatus('paid')
    setPaymentRef('')
    setSubmitted(false)
    setCreatedBuyer(null)
    setShowTicketModal(false)
  }

  if (isViewer) {
    return (
      <div className="card fade-in" style={{ maxWidth: 600, margin: '40px auto' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(217,119,6,0.18)',
              color: '#b45309',
            }}
          >
            <Lock size={30} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1f35', marginBottom: 8 }}>
            View-Only Access
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
            You are currently signed in with an observer account. You have full read-only visibility across the system, but adding buyers or dispatching emails is restricted.
          </p>
          <button className="btn btn-primary" onClick={onNavigateToBuyers}>
            View Attendees Directory
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  if (submitted && createdBuyer) {
    const isPaid = createdBuyer.payment_status === 'paid'

    return (
      <div className="card fade-in" style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <div
            style={{
              width: 68,
              height: 68,
              background: isPaid ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: isPaid ? '0 8px 24px rgba(34,197,94,0.3)' : '0 8px 24px rgba(245,158,11,0.3)',
            }}
          >
            {isPaid ? <CheckCircle2 size={36} color="white" /> : <Clock size={36} color="white" />}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {isPaid ? 'Buyer Registered & Confirmed!' : 'Buyer Added (Pending Payment)'}
          </h2>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 20px' }}>
            <strong style={{ color: '#1e293b' }}>{createdBuyer.name}</strong> from {createdBuyer.company} has been added to the system.
          </p>

          {/* Ticket Reference & Details Card */}
          <div
            style={{
              background: '#f8fafc',
              border: isPaid ? '1.5px solid #bbf7d0' : '1.5px solid #fed7aa',
              borderRadius: 12,
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: 20,
            }}
          >
            {isPaid && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Ticket Reference Number
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                    {createdBuyer.ticket_number}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '3px 9px',
                    borderRadius: 20,
                  }}
                >
                  PAID &bull; CONFIRMED
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
              <div>
                <span style={{ color: '#64748b' }}>Email:</span> <strong style={{ color: '#1e293b' }}>{createdBuyer.email}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mobile:</span> <strong style={{ color: '#1e293b' }}>{createdBuyer.mobile}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Meal:</span> <strong style={{ color: '#1e293b' }}>{createdBuyer.meal_preference === 'vegetarian' ? 'Veg' : 'Non-Veg'}</strong>
              </div>
              {createdBuyer.payment_ref && (
                <div>
                  <span style={{ color: '#64748b' }}>PayHere Ref:</span> <code style={{ color: '#0f172a' }}>{createdBuyer.payment_ref}</code>
                </div>
              )}
            </div>
          </div>

          {/* Notice: Zero auto emails */}
          <div
            style={{
              background: '#eff6ff',
              borderLeft: '4px solid #3b82f6',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              color: '#1e40af',
              lineHeight: 1.5,
              textAlign: 'left',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: '#2563eb' }} />
            <div>
              <strong>No automatic emails were sent.</strong> As requested, emails are sent manually only when you choose. You can dispatch an email now using the button below or do it later from the Buyers list.
            </div>
          </div>

          {/* Manual Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {isPaid ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleManualSendTicketEmail}
                  disabled={sendingTicket}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {sendingTicket ? (
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <SendHorizonal size={15} />
                  )}
                  {sendingTicket
                    ? 'Sending E-Ticket…'
                    : createdBuyer.ticket_email_status === 'sent'
                    ? 'E-Ticket Sent (Send Again)'
                    : 'Email E-Ticket Pass Now'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowTicketModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <QrCode size={15} />
                  View / Print Ticket Pass
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleManualSendInviteEmail}
                disabled={sendingInvite}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {sendingInvite ? (
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <SendHorizonal size={15} />
                )}
                {sendingInvite
                  ? 'Sending Invitation…'
                  : createdBuyer.email_status === 'sent'
                  ? 'Invitation Sent (Send Again)'
                  : 'Send Invitation & Payment Link Email'}
              </button>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleAddAnother}>
              <UserPlus size={15} />
              Add Another Buyer
            </button>
            <button className="btn btn-secondary" onClick={onNavigateToBuyers}>
              View All Buyers
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Ticket Modal if viewed */}
        {showTicketModal && (
          <TicketModal
            buyer={createdBuyer}
            eventSettings={eventSettings}
            onClose={() => setShowTicketModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="card fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">Add New Buyer</h2>
          <p style={{ fontSize: 13, color: '#8892aa', marginTop: 3 }}>
            Fill in the buyer's details. All required fields are marked with *
          </p>
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
          }}
        >
          <UserPlus size={20} />
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          {/* Section: Personal Info */}
          <div style={{ marginBottom: 8 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#b0b8d8',
                marginBottom: 16,
              }}
            >
              Personal Information
            </p>
          </div>

          <div className="form-grid-2">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`form-control ${errors.name ? 'error' : ''}`}
                placeholder="e.g. Kamal Perera"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
              {errors.name && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.name}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-control ${errors.email ? 'error' : ''}`}
                placeholder="e.g. kamal@company.lk"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.email}
                </span>
              )}
            </div>

            {/* Mobile */}
            <div className="form-group">
              <label className="form-label" htmlFor="mobile">
                WhatsApp / Mobile <span className="required">*</span>
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                className={`form-control ${errors.mobile ? 'error' : ''}`}
                placeholder="e.g. +94 77 123 4567"
                value={formData.mobile}
                onChange={handleChange}
                autoComplete="tel"
              />
              {errors.mobile && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.mobile}
                </span>
              )}
              <p className="form-hint">Include country code, e.g. +94 for Sri Lanka</p>
            </div>

            {/* Company */}
            <div className="form-group">
              <label className="form-label" htmlFor="company">
                Company / Organization <span className="required">*</span>
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className={`form-control ${errors.company ? 'error' : ''}`}
                placeholder="e.g. Acme Holdings Ltd."
                value={formData.company}
                onChange={handleChange}
                autoComplete="organization"
              />
              {errors.company && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.company}
                </span>
              )}
            </div>

            {/* Designation */}
            <div className="form-group">
              <label className="form-label" htmlFor="designation">
                Designation / Job Title <span className="required">*</span>
              </label>
              <input
                id="designation"
                name="designation"
                type="text"
                className={`form-control ${errors.designation ? 'error' : ''}`}
                placeholder="e.g. Chief Financial Officer"
                value={formData.designation}
                onChange={handleChange}
                autoComplete="organization-title"
              />
              {errors.designation && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.designation}
                </span>
              )}
            </div>

            {/* Meal Preference */}
            <div className="form-group">
              <label className="form-label" htmlFor="meal_preference">
                Meal Preference <span className="required">*</span>
              </label>
              <select
                id="meal_preference"
                name="meal_preference"
                className={`form-control ${errors.meal_preference ? 'error' : ''}`}
                value={formData.meal_preference}
                onChange={handleChange}
              >
                {MEAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.meal_preference && (
                <span className="form-error">
                  <AlertCircle size={12} /> {errors.meal_preference}
                </span>
              )}
            </div>
          </div>

          {/* Optional Section */}
          <div className="divider" />
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: '#b0b8d8',
              marginBottom: 16,
            }}
          >
            Additional Notes <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
          </p>

          {/* Meal Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="meal_notes">
              Meal / Dietary Notes
            </label>
            <textarea
              id="meal_notes"
              name="meal_notes"
              className="form-control"
              placeholder="e.g. No shellfish, gluten-free..."
              rows={2}
              value={formData.meal_notes}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Special Notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="special_notes">
              Special Requirements / Notes
            </label>
            <textarea
              id="special_notes"
              name="special_notes"
              className="form-control"
              placeholder="e.g. Requires wheelchair access, VIP seating preference..."
              rows={2}
              value={formData.special_notes}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Section: Payment & Ticket Status */}
          <div className="divider" />
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: '#b0b8d8',
              marginBottom: 12,
            }}
          >
            Payment &amp; Ticket Status
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
            {/* Option 1: Already Paid */}
            <div
              onClick={() => setPaymentStatus('paid')}
              style={{
                border: paymentStatus === 'paid' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                background: paymentStatus === 'paid' ? '#f0fdf4' : '#ffffff',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <input
                  type="radio"
                  id="status_paid"
                  name="paymentStatus"
                  checked={paymentStatus === 'paid'}
                  onChange={() => setPaymentStatus('paid')}
                  style={{ accentColor: '#16a34a', width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="status_paid" style={{ fontWeight: 700, fontSize: 13.5, color: paymentStatus === 'paid' ? '#15803d' : '#1e293b', cursor: 'pointer', margin: 0 }}>
                  ✅ Already Paid (Issue Ticket)
                </label>
              </div>
              <p style={{ margin: '4px 0 0 24px', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Immediately marks as paid &amp; generates ticket number. <strong>No automatic emails sent.</strong>
              </p>
            </div>

            {/* Option 2: Pending Payment */}
            <div
              onClick={() => setPaymentStatus('unpaid')}
              style={{
                border: paymentStatus === 'unpaid' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                background: paymentStatus === 'unpaid' ? '#fffbeb' : '#ffffff',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <input
                  type="radio"
                  id="status_unpaid"
                  name="paymentStatus"
                  checked={paymentStatus === 'unpaid'}
                  onChange={() => setPaymentStatus('unpaid')}
                  style={{ accentColor: '#f59e0b', width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="status_unpaid" style={{ fontWeight: 700, fontSize: 13.5, color: paymentStatus === 'unpaid' ? '#b45309' : '#1e293b', cursor: 'pointer', margin: 0 }}>
                  ⏳ Pending Payment (Unpaid)
                </label>
              </div>
              <p style={{ margin: '4px 0 0 24px', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Saves buyer as unpaid. You can send the payment link invitation manually later.
              </p>
            </div>
          </div>

          {/* If Already Paid: PayHere reference input */}
          {paymentStatus === 'paid' && (
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <label className="form-label" htmlFor="payment_ref" style={{ fontSize: 12.5, marginBottom: 6 }}>
                PayHere Payment ID / Transaction Reference <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="payment_ref"
                type="text"
                className="form-control"
                placeholder="e.g. 12004859 or PayHere Online / Bank Transfer"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
              <p className="form-hint" style={{ marginTop: 4, marginBottom: 0 }}>
                Optional transaction reference from your PayHere merchant dashboard.
              </p>
            </div>
          )}

          {/* If Pending Payment: Notice that email dispatch is manual */}
          {paymentStatus === 'unpaid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <Info size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
                No automatic emails will be sent. You can send the invitation &amp; payment link manually after adding or from the Attendees Directory.
              </span>
            </div>
          )}

          <div className="divider" />

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  mobile: '',
                  company: '',
                  designation: '',
                  meal_preference: 'non_vegetarian',
                  meal_notes: '',
                  special_notes: '',
                })
                setErrors({})
              }}
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Add Buyer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
