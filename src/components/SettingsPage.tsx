import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../services/emailService'
import {
  Settings2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_SETTINGS: Record<string, string> = {
  event_name: 'CBA Forum 2026',
  event_location: 'Waters Edge Hotel',
  event_time: '3:00 PM – 7:00 PM',
  ticket_price: 'LKR 3,000',
  payment_link: '',
  email_from_name: 'CBA Forum',
  email_from_address: 'noreply@cbaforum.lk',
  email_subject: 'You Are Invited – CBA Forum 2026',
  email_body: '',
}

const PLACEHOLDERS = [
  { tag: '{{name}}', desc: "Buyer's full name" },
  { tag: '{{email}}', desc: "Buyer's email" },
  { tag: '{{mobile}}', desc: "Buyer's mobile" },
  { tag: '{{event_name}}', desc: 'Event name' },
  { tag: '{{event_location}}', desc: 'Venue' },
  { tag: '{{event_time}}', desc: 'Event time' },
  { tag: '{{ticket_price}}', desc: 'Ticket price' },
  { tag: '{{payment_link}}', desc: 'Payment URL' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const data = await getSettings()
    setSettings((prev) => ({ ...prev, ...data }))
    setLoading(false)
  }

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await saveSettings(settings)
    setSaving(false)
    if (error) {
      toast.error(`Failed to save: ${error}`)
    } else {
      toast.success('Settings saved successfully!')
    }
  }

  // Generate preview with sample data
  function getPreviewHtml(): string {
    return (settings.email_body || '<p>No template set.</p>')
      .replace(/{{name}}/g, 'Kamal Perera')
      .replace(/{{email}}/g, 'kamal@example.lk')
      .replace(/{{mobile}}/g, '+94 77 123 4567')
      .replace(/{{event_name}}/g, settings.event_name || 'CBA Forum 2026')
      .replace(/{{event_location}}/g, settings.event_location || 'Waters Edge Hotel')
      .replace(/{{event_time}}/g, settings.event_time || '3:00 PM – 7:00 PM')
      .replace(/{{ticket_price}}/g, settings.ticket_price || 'LKR 3,000')
      .replace(/{{payment_link}}/g, settings.payment_link || '#')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <RefreshCw size={24} style={{ color: '#b0b8d8', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#8892aa', marginTop: 12 }}>Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Configure event details and email template</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span className="spinner" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Event Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Event Details</h2>
            <Settings2 size={18} style={{ color: '#b0b8d8' }} />
          </div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: '#b0b8d8', marginBottom: 16 }}>
              These values populate <code style={{ background: '#f0f2f8', padding: '1px 5px', borderRadius: 4 }}>{'{{event_*}}'}</code> placeholders in your email.
            </p>

            <div className="form-group">
              <label className="form-label">Event Name</label>
              <input
                className="form-control"
                value={settings.event_name}
                onChange={(e) => handleChange('event_name', e.target.value)}
                placeholder="e.g. CBA Forum 2026"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Venue / Location</label>
              <input
                className="form-control"
                value={settings.event_location}
                onChange={(e) => handleChange('event_location', e.target.value)}
                placeholder="e.g. Waters Edge Hotel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Event Time</label>
              <input
                className="form-control"
                value={settings.event_time}
                onChange={(e) => handleChange('event_time', e.target.value)}
                placeholder="e.g. 3:00 PM – 7:00 PM"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ticket Price</label>
              <input
                className="form-control"
                value={settings.ticket_price}
                onChange={(e) => handleChange('ticket_price', e.target.value)}
                placeholder="e.g. LKR 3,000"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Payment Link <span className="required">*</span>
              </label>
              <input
                className="form-control"
                type="url"
                value={settings.payment_link}
                onChange={(e) => handleChange('payment_link', e.target.value)}
                placeholder="https://pay.cbaforum.lk"
              />
              <p className="form-hint">This URL is the "Complete Payment Now" button in the email.</p>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Email Settings</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Sender Name</label>
              <input
                className="form-control"
                value={settings.email_from_name}
                onChange={(e) => handleChange('email_from_name', e.target.value)}
                placeholder="CBA Forum"
              />
              <p className="form-hint">Appears as the "From" name in the recipient's inbox.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Sender Email Address</label>
              <input
                className="form-control"
                type="email"
                value={settings.email_from_address}
                onChange={(e) => handleChange('email_from_address', e.target.value)}
                placeholder="noreply@cbaforum.lk"
              />
              <p className="form-hint">The sender email address shown to recipients.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Subject</label>
              <input
                className="form-control"
                value={settings.email_subject}
                onChange={(e) => handleChange('email_subject', e.target.value)}
                placeholder="You Are Invited – CBA Forum 2026"
              />
            </div>

            <div className="divider" />

            {/* Placeholder reference */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#3d4466', marginBottom: 10 }}>
              Available Placeholders
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLACEHOLDERS.map(({ tag, desc }) => (
                <div
                  key={tag}
                  title={desc}
                  style={{
                    background: '#f0f4ff',
                    border: '1px solid #dde6ff',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 12,
                    color: '#3b82f6',
                    fontFamily: 'monospace',
                    cursor: 'default',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#b0b8d8', marginTop: 8 }}>
              Hover over a placeholder to see what it inserts. Click to copy.
            </p>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 className="card-title">Email Body (HTML)</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Edit HTML' : 'Preview Email'}
          </button>
        </div>
        <div className="card-body">
          {!showPreview ? (
            <>
              <div
                style={{
                  background: '#f8f9fd',
                  border: '1.5px solid #dde0ec',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  fontSize: 12,
                  color: '#8892aa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={13} />
                Write HTML. Use placeholders like{' '}
                <code style={{ background: '#eceef5', padding: '1px 5px', borderRadius: 3 }}>
                  {'{{name}}'}
                </code>{' '}
                — they will be replaced per buyer. Click "Preview Email" to see the result.
              </div>
              <textarea
                className="form-control"
                rows={18}
                value={settings.email_body}
                onChange={(e) => handleChange('email_body', e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
                placeholder="<p>Dear {{name}},</p><p>You are invited...</p>"
              />
            </>
          ) : (
            <div>
              <div
                style={{
                  background: '#f0fff4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={13} />
                Preview uses sample data: <strong>Kamal Perera</strong>, kamal@example.lk, +94 77 123 4567
              </div>
              <div
                style={{
                  border: '1.5px solid #dde0ec',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#f4f6fb',
                  padding: 20,
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button at bottom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span className="spinner" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
