import { useState } from 'react'
import { type Buyer } from '../lib/supabase'
import { updateBuyer } from '../services/buyerService'
import { extractPriceNumber, formatAmount } from '../utils/priceUtils'
import { X, Save, UserCheck, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditBuyerModalProps {
  buyer: Buyer
  eventSettings: Record<string, string>
  onClose: () => void
  onSaved: (updatedBuyer: Buyer) => void
}

export default function EditBuyerModal({
  buyer,
  eventSettings,
  onClose,
  onSaved,
}: EditBuyerModalProps) {
  const [formData, setFormData] = useState({
    name: buyer.name || '',
    email: buyer.email || '',
    mobile: buyer.mobile || '',
    company: buyer.company || '',
    designation: buyer.designation || '',
    meal_preference: buyer.meal_preference || 'non_vegetarian',
    meal_notes: buyer.meal_notes || '',
    special_notes: buyer.special_notes || '',
    payment_status: buyer.payment_status || 'unpaid',
    payment_ref: buyer.payment_ref || '',
    ticket_number: buyer.ticket_number || '',
    ticket_price: buyer.ticket_price || '',
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Live calculated numeric value for revenue
  const parsedPrice = extractPriceNumber(formData.ticket_price)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Full name is required.'
    if (!formData.email.trim()) newErrors.email = 'Email address is required.'
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required.'
    if (!formData.company.trim()) newErrors.company = 'Company is required.'
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required.'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)

    const updates: Partial<Buyer> = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile.trim(),
      company: formData.company.trim(),
      designation: formData.designation.trim(),
      meal_preference: formData.meal_preference as Buyer['meal_preference'],
      meal_notes: formData.meal_notes.trim() || null,
      special_notes: formData.special_notes.trim() || null,
      payment_status: formData.payment_status as Buyer['payment_status'],
      payment_ref: formData.payment_ref.trim() || null,
      ticket_number: formData.ticket_number.trim() || null,
      ticket_price: formData.ticket_price.trim() || null,
    }

    // If marked paid but had no confirmed time, set now
    if (formData.payment_status === 'paid' && !buyer.payment_confirmed_at) {
      updates.payment_confirmed_at = new Date().toISOString()
    }

    const { data, error } = await updateBuyer(buyer.id, updates)
    setSaving(false)

    if (error) {
      toast.error(`Failed to update buyer: ${error}`)
      return
    }

    toast.success(`Updated ${formData.name}'s details successfully!`)
    if (data) {
      onSaved(data)
    } else {
      onSaved({ ...buyer, ...updates })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 680,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Edit Attendee &amp; Ticket Price
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Super Admin Master Edit &bull; Updates database, tickets &amp; revenue calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {/* Section 1: Pricing & Payment (High Priority) */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Tag size={16} style={{ color: '#16a34a' }} />
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#15803d' }}>
                Per-Buyer Ticket Price &amp; Payment Status
              </h3>
            </div>

            <div className="form-grid-2">
              {/* Ticket Price Field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="ticket_price" style={{ fontWeight: 700, color: '#166534' }}>
                  Custom Ticket Price / Fee (Text)
                </label>
                <input
                  id="ticket_price"
                  name="ticket_price"
                  type="text"
                  className="form-control"
                  placeholder={`e.g. ${eventSettings.ticket_price || 'LKR 3,500'} or Complimentary`}
                  value={formData.ticket_price}
                  onChange={handleChange}
                  style={{ background: '#ffffff', borderColor: '#86efac', fontWeight: 600 }}
                />
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🔢 Revenue Count:</span>
                  <strong>{parsedPrice > 0 ? `LKR ${formatAmount(parsedPrice)}` : 'LKR 0 (or Unset)'}</strong>
                  {formData.ticket_price && !parsedPrice && (
                    <span style={{ color: '#059669', fontStyle: 'italic' }}>— recognized as complimentary</span>
                  )}
                </div>
              </div>

              {/* Payment Status Dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="payment_status" style={{ fontWeight: 700, color: '#166534' }}>
                  Payment Status
                </label>
                <select
                  id="payment_status"
                  name="payment_status"
                  className="form-control"
                  value={formData.payment_status}
                  onChange={handleChange}
                  style={{ background: '#ffffff', borderColor: '#86efac', fontWeight: 600 }}
                >
                  <option value="paid">✅ Paid (Confirmed)</option>
                  <option value="unpaid">⏳ Unpaid (Pending)</option>
                  <option value="pending">🕒 Processing / Verifying</option>
                  <option value="refunded">↩️ Refunded / Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: 12 }}>
              {/* PayHere Reference */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="payment_ref" style={{ fontSize: 12 }}>
                  PayHere Payment ID / Ref
                </label>
                <input
                  id="payment_ref"
                  name="payment_ref"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 12004859 or Bank Transfer"
                  value={formData.payment_ref}
                  onChange={handleChange}
                  style={{ background: '#ffffff' }}
                />
              </div>

              {/* Ticket Reference Number */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="ticket_number" style={{ fontSize: 12 }}>
                  Ticket Reference Number
                </label>
                <input
                  id="ticket_number"
                  name="ticket_number"
                  type="text"
                  className="form-control"
                  placeholder="e.g. CBA-2026-XXXX"
                  value={formData.ticket_number}
                  onChange={handleChange}
                  style={{ background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: 12,
              }}
            >
              Attendee Information
            </p>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`form-control ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                />
                {errors.name && (
                  <span className="form-error">
                    <AlertCircle size={12} /> {errors.name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <span className="form-error">
                    <AlertCircle size={12} /> {errors.email}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobile">
                  Mobile / WhatsApp <span className="required">*</span>
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  type="text"
                  className={`form-control ${errors.mobile ? 'error' : ''}`}
                  value={formData.mobile}
                  onChange={handleChange}
                />
                {errors.mobile && (
                  <span className="form-error">
                    <AlertCircle size={12} /> {errors.mobile}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="meal_preference">
                  Meal Preference
                </label>
                <select
                  id="meal_preference"
                  name="meal_preference"
                  className="form-control"
                  value={formData.meal_preference}
                  onChange={handleChange}
                >
                  <option value="non_vegetarian">🍖 Non-Vegetarian</option>
                  <option value="vegetarian">🥦 Vegetarian</option>
                  <option value="other">🍽️ Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="company">
                  Company / Organization <span className="required">*</span>
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  className={`form-control ${errors.company ? 'error' : ''}`}
                  value={formData.company}
                  onChange={handleChange}
                />
                {errors.company && (
                  <span className="form-error">
                    <AlertCircle size={12} /> {errors.company}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="designation">
                  Designation / Role <span className="required">*</span>
                </label>
                <input
                  id="designation"
                  name="designation"
                  type="text"
                  className={`form-control ${errors.designation ? 'error' : ''}`}
                  value={formData.designation}
                  onChange={handleChange}
                />
                {errors.designation && (
                  <span className="form-error">
                    <AlertCircle size={12} /> {errors.designation}
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="meal_notes">
                  Meal Notes (Optional)
                </label>
                <input
                  id="meal_notes"
                  name="meal_notes"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Gluten-free, no shellfish"
                  value={formData.meal_notes}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="special_notes">
                  Special Notes (Optional)
                </label>
                <input
                  id="special_notes"
                  name="special_notes"
                  type="text"
                  className="form-control"
                  placeholder="e.g. VIP Seating, Guest of Honor"
                  value={formData.special_notes}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 24,
              borderTop: '1px solid #e2e8f0',
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 140 }}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
