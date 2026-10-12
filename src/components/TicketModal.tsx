import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { type Buyer } from '../lib/supabase'
import { X, Printer, SendHorizonal, CheckCircle2, QrCode, MapPin, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { sendBuyerTicketEmail } from '../services/ticketService'
import { useAuth } from '../context/AuthContext'

interface TicketModalProps {
  buyer: Buyer | null
  eventSettings: Record<string, string>
  onClose: () => void
  onTicketSent?: () => void
}

export default function TicketModal({ buyer, eventSettings, onClose, onTicketSent }: TicketModalProps) {
  const { isViewer } = useAuth()
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [resending, setResending] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!buyer) return

    const ticketNumber = buyer.ticket_number || `CBA-2026-${buyer.id.substring(0, 4).toUpperCase()}`
    const payload = `TICKET:${ticketNumber}|NAME:${buyer.name}|EVENT:${eventSettings.event_name || 'CBA Forum 2026'}|VENUE:${eventSettings.event_location || 'Waters Edge Hotel'}|TIME:${eventSettings.event_time || '3:00 PM – 7:00 PM'}`

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err))
  }, [buyer, eventSettings])

  if (!buyer) return null

  const ticketNum = buyer.ticket_number || `CBA-2026-${buyer.id.substring(0, 4).toUpperCase()}`
  const mealLabel = buyer.meal_preference === 'vegetarian'
    ? '🥦 Veg'
    : buyer.meal_preference === 'non_vegetarian'
    ? '🍖 Non-Veg'
    : '🍽️ Other'

  async function handleResendEmail() {
    if (isViewer) {
      toast.error('View-only profile cannot dispatch ticket emails.')
      return
    }
    if (!buyer) return
    setResending(true)
    const { success, error } = await sendBuyerTicketEmail(buyer.id, buyer)
    setResending(false)
    if (success) {
      toast.success(`E-Ticket sent to ${buyer.email}!`)
      onTicketSent?.()
    } else {
      toast.error(`Ticket email failed: ${error ?? 'Unknown error'}`)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          maxWidth: 580,
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
      >
        {/* Header Action Bar */}
        <div
          className="ticket-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
              Official E-Ticket Pass
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handlePrint}
              style={{ padding: '6px 12px', fontSize: 12 }}
              title="Print ticket pass"
            >
              <Printer size={13} /> Print
            </button>
            {!isViewer && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleResendEmail}
                disabled={resending}
                style={{ padding: '6px 12px', fontSize: 12 }}
                title="Send/Resend ticket to buyer email"
              >
                {resending ? (
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                ) : (
                  <SendHorizonal size={13} />
                )}
                {resending ? 'Sending…' : 'Email Ticket'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Ticket Pass */}
        <div ref={ticketRef} className="ticket-pass-container" style={{ padding: 24 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 24px 20px',
              color: '#ffffff',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(147, 197, 253, 0.3)',
                color: '#93c5fd',
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: 20,
                marginBottom: 8,
              }}
            >
              CBA Forum 2026 &bull; Entry Pass
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              {eventSettings.event_name || 'CBA Forum 2026'}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: '#cbd5e1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#60a5fa" /> {eventSettings.event_location || 'Waters Edge Hotel'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#60a5fa" /> {eventSettings.event_time || '3:00 PM – 7:00 PM'}
              </span>
            </div>
          </div>

          {/* Ticket Body Card */}
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderTop: 'none',
              borderRadius: '0 0 16px 16px',
              padding: '20px 24px',
              background: '#f8fafc',
            }}
          >
            {/* Top Bar with Ticket # and Status */}
            <div
              className="ticket-meta-bar"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Ticket Reference
                </span>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  {ticketNum}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={12} /> CONFIRMED &bull; {eventSettings.ticket_price || 'LKR 3,000'}
                </span>
                {buyer.payment_ref && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    PayHere Ref: <code style={{ color: '#0f172a' }}>{buyer.payment_ref}</code>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Section: Attendee details + QR Code side-by-side */}
            <div className="ticket-details-grid">
              {/* Attendee Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Attendee Name</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{buyer.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Company & Designation</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    {buyer.company} &bull; <span style={{ color: '#64748b', fontWeight: 500 }}>{buyer.designation}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Contact</div>
                  <div style={{ fontSize: 12.5, color: '#334155' }}>
                    {buyer.mobile} &bull; {buyer.email}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Meal Preference</div>
                  <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 500 }}>{mealLabel}</div>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR Code"
                    style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'inline-block' }}
                  />
                ) : (
                  <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Generating QR…
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
                  Scan for Desk Check-In
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#eff6ff',
                borderLeft: '3px solid #3b82f6',
                borderRadius: 6,
                fontSize: 11.5,
                color: '#1e40af',
                lineHeight: 1.5,
              }}
            >
              Please present this pass on your phone screen or bring a printed copy to the registration desk at Waters Edge Hotel.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
