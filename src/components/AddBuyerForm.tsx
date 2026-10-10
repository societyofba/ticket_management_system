import { useState } from 'react'
import { createBuyer } from '../services/buyerService'
import { sendBuyerEmail } from '../services/emailService'
import { type BuyerInsert } from '../lib/supabase'
import { UserPlus, AlertCircle, CheckCircle2, ChevronRight, Mail, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddBuyerFormProps {
  onSuccess?: () => void
  onNavigateToBuyers?: () => void
}

const MEAL_OPTIONS = [
  { value: 'non_vegetarian', label: '🍖 Non-Vegetarian' },
  { value: 'vegetarian', label: '🥦 Vegetarian' },
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

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [emailResult, setEmailResult] = useState<'sending' | 'sent' | 'failed' | null>(null)

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
    if (!validate()) return

    setSubmitting(true)

    const payload: BuyerInsert = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile.trim(),
      company: formData.company.trim(),
      designation: formData.designation.trim(),
      meal_preference: formData.meal_preference,
      meal_notes: formData.meal_notes.trim() || null,
      special_notes: formData.special_notes.trim() || null,
    }

    const { data, error } = await createBuyer(payload)
    setSubmitting(false)

    if (error) {
      toast.error(`Failed to add buyer: ${error}`)
      return
    }

    toast.success('Buyer added! Sending invitation email…')
    setCreatedId(data?.id ?? null)
    setSubmitted(true)
    onSuccess?.()

    // Auto-send email
    if (data?.id) {
      setEmailResult('sending')
      const { success, error: emailErr } = await sendBuyerEmail(data.id, data)
      if (success) {
        setEmailResult('sent')
        toast.success('Invitation email sent!')
      } else {
        setEmailResult('failed')
        toast.error(`Email failed: ${emailErr ?? 'Unknown error'}`)
      }
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
    setSubmitted(false)
    setCreatedId(null)
    setEmailResult(null)
  }

  if (submitted) {
    return (
      <div className="card fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
            }}
          >
            <CheckCircle2 size={36} color="white" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1f35', marginBottom: 8 }}>
            Buyer Added Successfully!
          </h2>
          <p style={{ color: '#8892aa', fontSize: 14, marginBottom: 16 }}>
            <strong style={{ color: '#3d4466' }}>{formData.name}</strong> has been registered.
          </p>

          {/* Email status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              marginBottom: 24,
              fontSize: 13.5,
              fontWeight: 600,
              ...(emailResult === 'sending'
                ? { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }
                : emailResult === 'sent'
                ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                : emailResult === 'failed'
                ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
                : { background: '#f8f9fd', color: '#8892aa', border: '1px solid #eceef5' }),
            }}
          >
            {emailResult === 'sending' && (
              <><span className="spinner spinner-dark" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending invitation email…</>
            )}
            {emailResult === 'sent' && (
              <><CheckCircle2 size={15} /> Invitation email sent to {formData.email}</>
            )}
            {emailResult === 'failed' && (
              <><XCircle size={15} /> Email failed — you can resend from the Buyers list</>
            )}
            {!emailResult && (
              <><Mail size={15} /> Email status unknown</>
            )}
          </div>
          {createdId && (
            <p style={{ fontSize: 12, color: '#b0b8d8', marginBottom: 28 }}>
              ID: <code style={{ background: '#f0f2f8', padding: '2px 6px', borderRadius: 4 }}>{createdId}</code>
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleAddAnother}>
              <UserPlus size={15} />
              Add Another Buyer
            </button>
            <button className="btn btn-primary" onClick={onNavigateToBuyers}>
              View All Buyers
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
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
