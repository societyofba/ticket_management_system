import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../services/emailService'
import { getAllAdmins, updateAdminPassword } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { type AdminUser } from '../lib/supabase'
import {
  Settings2,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  MessageSquare,
  Ticket,
  Lock,
  Users,
  KeyRound,
  ShieldAlert,
  LogOut,
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
  sms_sender_id: 'SMSlenzDEMO',
  sms_template: 'Hi {{name}}, you are eligible to participate in {{event_name}} at {{event_location}} on {{event_time}}. Ticket: {{ticket_price}}. Complete payment & book: {{payment_link}}',
  sms_auto_send: 'true',
  ticket_email_subject: 'Your Official E-Ticket – CBA Forum 2026',
  ticket_terms: 'Please present this digital pass or printed copy at the entrance desk at Waters Edge Hotel.',
  ticket_email_template: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:32px;text-align:center;color:#ffffff;">
    <div style="display:inline-block;background:rgba(59,130,246,0.25);border:1px solid rgba(147,197,253,0.3);color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:10px;">Official Event Pass</div>
    <h1 style="margin:0;font-size:24px;font-weight:800;">{{event_name}}</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:13.5px;">📍 {{event_location}} &bull; 🕒 {{event_time}}</p>
  </div>

  <!-- Ticket Body -->
  <div style="padding:28px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin-bottom:20px;text-align:center;">
      <span style="color:#15803d;font-weight:700;font-size:13.5px;">🎉 Payment Confirmed &bull; Ticket Issued</span>
    </div>

    <!-- Ticket Card -->
    <div style="border:2px dashed #cbd5e1;border-radius:12px;padding:22px;background:#f8fafc;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;">
        <div>
          <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Ticket Reference</span>
          <div style="font-size:17px;font-weight:800;color:#0f172a;font-family:monospace;">{{ticket_number}}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Status</span>
          <div style="font-size:13px;font-weight:700;color:#16a34a;">PAID ({{ticket_price}})</div>
        </div>
      </div>

      <!-- Attendee Information -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;width:35%;"><strong>Attendee Name:</strong></td>
          <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:700;">{{name}}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;"><strong>Company:</strong></td>
          <td style="padding:5px 0;color:#334155;font-size:13px;">{{company}}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;"><strong>Designation:</strong></td>
          <td style="padding:5px 0;color:#334155;font-size:13px;">{{designation}}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;"><strong>Contact:</strong></td>
          <td style="padding:5px 0;color:#334155;font-size:13px;">{{mobile}} &bull; {{email}}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;"><strong>Meal Choice:</strong></td>
          <td style="padding:5px 0;color:#334155;font-size:13px;">{{meal_preference}}</td>
        </tr>
      </table>

      <!-- QR Code Section -->
      <div style="text-align:center;padding:14px 0 6px;border-top:1px solid #e2e8f0;">
        <img src="{{qr_code_url}}" alt="QR Code" width="160" height="160" style="display:inline-block;border:1px solid #cbd5e1;padding:8px;background:#ffffff;border-radius:10px;" />
        <p style="margin:8px 0 0;font-size:11.5px;color:#64748b;">Scan at the entrance desk for rapid check-in</p>
      </div>
    </div>

    <!-- Instructions -->
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:8px;font-size:12px;color:#1e40af;line-height:1.5;">
      <strong>Check-In Instructions:</strong><br/>
      Please present this digital pass on your phone screen or bring a printout to the registration desk at Waters Edge Hotel upon arrival.
    </div>

    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">
      CBA Forum Organizing Committee &bull; Waters Edge Hotel
    </div>
  </div>
</div>`,
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

const TICKET_PLACEHOLDERS = [
  { tag: '{{name}}', desc: "Buyer's full name" },
  { tag: '{{email}}', desc: "Buyer's email" },
  { tag: '{{mobile}}', desc: "Buyer's mobile" },
  { tag: '{{company}}', desc: "Company / Organization" },
  { tag: '{{designation}}', desc: "Job Title" },
  { tag: '{{meal_preference}}', desc: "Meal Selection" },
  { tag: '{{ticket_number}}', desc: "Unique Ticket # (e.g. CBA-2026-08AF)" },
  { tag: '{{qr_code_url}}', desc: "Scannable QR Code Image" },
  { tag: '{{payment_ref}}', desc: "PayHere Transaction Ref" },
  { tag: '{{event_name}}', desc: "Event Name" },
  { tag: '{{event_location}}', desc: "Event Venue" },
  { tag: '{{event_time}}', desc: "Event Time" },
  { tag: '{{ticket_price}}', desc: "Ticket Price" },
]

export default function SettingsPage() {
  const { isSuperAdmin, currentAdmin, logout } = useAuth()
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showTicketPreview, setShowTicketPreview] = useState(false)
  const [adminsList, setAdminsList] = useState<AdminUser[]>([])
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    loadSettings()
    if (isSuperAdmin) {
      loadAdmins()
    }
  }, [isSuperAdmin])

  async function loadAdmins() {
    const { data } = await getAllAdmins()
    if (data) setAdminsList(data)
  }

  async function handleSaveAdminPassword(adminId: string) {
    if (!newPasswordValue.trim()) {
      toast.error('Password cannot be empty')
      return
    }
    setUpdatingPassword(true)
    const { error } = await updateAdminPassword(adminId, newPasswordValue)
    setUpdatingPassword(false)
    if (error) {
      toast.error(`Update failed: ${error}`)
    } else {
      toast.success('Admin password updated successfully!')
      setEditingAdminId(null)
      setNewPasswordValue('')
    }
  }

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

  // Generate invitation email preview
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

  // Generate SMS preview
  function getPreviewSms(): string {
    return (settings.sms_template || '')
      .replace(/{{name}}/g, 'Kamal Perera')
      .replace(/{{email}}/g, 'kamal@example.lk')
      .replace(/{{mobile}}/g, '+94 77 123 4567')
      .replace(/{{event_name}}/g, settings.event_name || 'CBA Forum 2026')
      .replace(/{{event_location}}/g, settings.event_location || 'Waters Edge Hotel')
      .replace(/{{event_time}}/g, settings.event_time || '3:00 PM – 7:00 PM')
      .replace(/{{ticket_price}}/g, settings.ticket_price || 'LKR 3,000')
      .replace(/{{payment_link}}/g, settings.payment_link || 'https://pay.cbaforum.lk')
  }

  // Generate E-Ticket preview
  function getPreviewTicketHtml(): string {
    const sampleQr = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CBA-2026-SAMPLE&margin=10'
    return (settings.ticket_email_template || '<p>No ticket template set.</p>')
      .replace(/{{name}}/g, 'Kamal Perera')
      .replace(/{{email}}/g, 'kamal.perera@acme.lk')
      .replace(/{{mobile}}/g, '+94 77 123 4567')
      .replace(/{{company}}/g, 'Acme Holdings Ltd.')
      .replace(/{{designation}}/g, 'Chief Financial Officer')
      .replace(/{{meal_preference}}/g, 'Non-Vegetarian')
      .replace(/{{ticket_number}}/g, 'CBA-2026-08AF')
      .replace(/{{payment_ref}}/g, 'PH-98421045')
      .replace(/{{qr_code_url}}/g, sampleQr)
      .replace(/{{event_name}}/g, settings.event_name || 'CBA Forum 2026')
      .replace(/{{event_location}}/g, settings.event_location || 'Waters Edge Hotel')
      .replace(/{{event_time}}/g, settings.event_time || '3:00 PM – 7:00 PM')
      .replace(/{{ticket_price}}/g, settings.ticket_price || 'LKR 3,000')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <RefreshCw size={24} style={{ color: '#b0b8d8', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#8892aa', marginTop: 12 }}>Loading settings…</p>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="fade-in" style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: '48px 36px', textAlign: 'center' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#1a1f35' }}>
            Access Restricted &bull; Super Admin Only
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
            You are logged in as <strong>{currentAdmin?.name || 'Event Admin'}</strong> with the <strong>Admin</strong> role.
            Per system security policy, settings, email/SMS templates, and ticket design can only be modified by the <strong>Super Admin</strong>.
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px 24px',
              textAlign: 'left',
              marginBottom: 28,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Role Permissions Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={15} /> Allowed for Admin:
                </span>
                <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#475569', lineHeight: 1.6 }}>
                  <li>View Dashboard &amp; Analytics</li>
                  <li>Register &amp; Search Buyers</li>
                  <li>Verify PayHere Payments</li>
                  <li>Issue Digital E-Tickets</li>
                  <li>Send/Resend Emails &amp; SMS</li>
                </ul>
              </div>
              <div>
                <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldAlert size={15} /> Super Admin Only:
                </span>
                <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#475569', lineHeight: 1.6 }}>
                  <li>Delete Buyer Records</li>
                  <li>Configure Event Details &amp; Price</li>
                  <li>Edit Email HTML Templates</li>
                  <li>Edit SMS Gateway Settings</li>
                  <li>Edit E-Ticket Layout Design</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Sign Out to Log In with Super Admin Credentials</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Configure event details, invitation email, SMS, and confirmed E-Ticket design</p>
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

      {/* Admin Accounts & Role Management Card (Super Admin Exclusive) */}
      <div className="card" style={{ marginBottom: 20, border: '1px solid #e0e7ff', background: '#fafbff' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e7ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Users size={18} />
            </div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Admin Accounts &amp; Role Management</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Manage administrator credentials and permission tiers
              </p>
            </div>
          </div>
          <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid #ddd6fe' }}>
            👑 Super Admin Only
          </span>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Super Admin Tile */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Super Admin</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>superadmin@cbaforum.lk</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: 6, border: '1px solid #e9d5ff', textTransform: 'uppercase' }}>
                  👑 Full Access
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
                <strong>Permissions:</strong> Delete buyers, edit system &amp; ticket settings, configure email &amp; SMS gateways, manage admins.
              </p>
              
              {editingAdminId === (adminsList.find((a) => a.role === 'super_admin')?.id || 'super-admin-default-id') ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="New password"
                    className="form-control"
                    style={{ fontSize: 12, padding: '6px 10px' }}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={updatingPassword}
                    onClick={() => handleSaveAdminPassword(adminsList.find((a) => a.role === 'super_admin')?.id || 'super-admin-default-id')}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setEditingAdminId(null); setNewPasswordValue('') }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setEditingAdminId(adminsList.find((a) => a.role === 'super_admin')?.id || 'super-admin-default-id')
                    setNewPasswordValue('')
                  }}
                >
                  <KeyRound size={13} />
                  <span>Change Password</span>
                </button>
              )}
            </div>

            {/* Regular Admin Tile */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Event Admin</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>admin@cbaforum.lk</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 6, border: '1px solid #bfdbfe', textTransform: 'uppercase' }}>
                  🛡️ Operations
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
                <strong>Permissions:</strong> Add/view buyers, verify PayHere payments, issue tickets, send emails &amp; SMS. <span style={{ color: '#dc2626' }}>Cannot delete buyers or change settings.</span>
              </p>
              
              {editingAdminId === (adminsList.find((a) => a.role === 'admin')?.id || 'regular-admin-default-id') ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="New password"
                    className="form-control"
                    style={{ fontSize: 12, padding: '6px 10px' }}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={updatingPassword}
                    onClick={() => handleSaveAdminPassword(adminsList.find((a) => a.role === 'admin')?.id || 'regular-admin-default-id')}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setEditingAdminId(null); setNewPasswordValue('') }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setEditingAdminId(adminsList.find((a) => a.role === 'admin')?.id || 'regular-admin-default-id')
                    setNewPasswordValue('')
                  }}
                >
                  <KeyRound size={13} />
                  <span>Change Password</span>
                </button>
              )}
            </div>
          </div>
        </div>
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
              These values populate <code style={{ background: '#f0f2f8', padding: '1px 5px', borderRadius: 4 }}>{'{{event_*}}'}</code> placeholders across emails and SMS.
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
                PayHere Payment Link <span className="required">*</span>
              </label>
              <input
                className="form-control"
                type="url"
                value={settings.payment_link}
                onChange={(e) => handleChange('payment_link', e.target.value)}
                placeholder="https://pay.cbaforum.lk"
              />
              <p className="form-hint">Used in invitation emails and SMS messages.</p>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Invitation Email Config</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Sender Display Name</label>
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
              <p className="form-hint">Reply-To address for attendee queries. Deliveries are securely authorized via your SMTP configuration.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invitation Email Subject</label>
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
          </div>
        </div>
      </div>

      {/* Confirmed E-Ticket Design Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={18} style={{ color: '#16a34a' }} />
            <h2 className="card-title">Confirmed E-Ticket Design & Email Template</h2>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTicketPreview((p) => !p)}
          >
            {showTicketPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showTicketPreview ? 'Edit Ticket HTML' : 'Preview Digital Ticket'}
          </button>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">E-Ticket Email Subject</label>
            <input
              className="form-control"
              value={settings.ticket_email_subject}
              onChange={(e) => handleChange('ticket_email_subject', e.target.value)}
              placeholder="Your Official E-Ticket – CBA Forum 2026"
            />
          </div>

          {!showTicketPreview ? (
            <>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                  fontSize: 12,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={14} />
                This HTML is emailed automatically when payment is confirmed in the <strong>Payments & Tickets</strong> tab.
              </div>
              <textarea
                className="form-control"
                rows={16}
                value={settings.ticket_email_template}
                onChange={(e) => handleChange('ticket_email_template', e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
              />

              {/* Ticket Placeholders */}
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Special E-Ticket Placeholders:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TICKET_PLACEHOLDERS.map(({ tag, desc }) => (
                    <div
                      key={tag}
                      title={desc}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 12,
                        color: '#0f172a',
                        fontFamily: 'monospace',
                      }}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
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
                Previewing ticket with sample attendee: <strong>Kamal Perera</strong> (CFO &bull; Acme Holdings)
              </div>
              <div
                style={{
                  border: '1.5px solid #dde0ec',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#f4f6fb',
                  padding: 24,
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: getPreviewTicketHtml() }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invitation Email Body Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 className="card-title">Initial Invitation Email (Before Payment)</h2>
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
            <textarea
              className="form-control"
              rows={14}
              value={settings.email_body}
              onChange={(e) => handleChange('email_body', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
              placeholder="<p>Dear {{name}},</p><p>You are invited...</p>"
            />
          ) : (
            <div
              style={{
                border: '1.5px solid #dde0ec',
                borderRadius: 10,
                overflow: 'hidden',
                background: '#f4f6fb',
                padding: 20,
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            </div>
          )}
        </div>
      </div>

      {/* SMSlenz SMS Settings */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} style={{ color: '#2563eb' }} />
            <h2 className="card-title">Mobile SMS Settings (SMSlenz Gateway)</h2>
          </div>
          <span style={{ fontSize: 12, background: '#eff6ff', color: '#1d4ed8', padding: '3px 9px', borderRadius: 6, fontWeight: 600 }}>
            Active: smslenz.lk
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Approved Sender ID (Mask Name)</label>
              <input
                className="form-control"
                value={settings.sms_sender_id}
                onChange={(e) => handleChange('sms_sender_id', e.target.value)}
                placeholder="SMSlenzDEMO"
              />
              <p className="form-hint">
                Use <code>SMSlenzDEMO</code> for testing, or <code>CBAFORUM</code> once approved by SMSlenz.
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Auto-Send on Buyer Registration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
                <input
                  type="checkbox"
                  id="sms_auto_send"
                  checked={settings.sms_auto_send !== 'false'}
                  onChange={(e) => handleChange('sms_auto_send', e.target.checked ? 'true' : 'false')}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="sms_auto_send" style={{ fontSize: 13.5, color: '#2c3358', cursor: 'pointer', userSelect: 'none' }}>
                  Automatically send SMS invitation when adding a new buyer
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>SMS Message Template</label>
              <span style={{ fontSize: 12, color: '#8892aa' }}>
                {(settings.sms_template || '').length} characters &bull;{' '}
                <strong style={{ color: (settings.sms_template || '').length > 160 ? '#d97706' : '#15803d' }}>
                  {Math.ceil(Math.max(1, (settings.sms_template || '').length) / 160)} SMS credit{Math.ceil(Math.max(1, (settings.sms_template || '').length) / 160) > 1 ? 's' : ''}
                </strong>
              </span>
            </div>
            <textarea
              className="form-control"
              rows={4}
              value={settings.sms_template}
              onChange={(e) => handleChange('sms_template', e.target.value)}
              placeholder="Hi {{name}}, you are eligible to participate in {{event_name}}..."
              style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
            />
          </div>

          {/* Live SMS Preview */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={13} /> Live SMS Preview:
            </p>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderLeft: '4px solid #22c55e',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {getPreviewSms()}
            </div>
          </div>
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
