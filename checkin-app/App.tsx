import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Vibration,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { type Buyer } from './src/supabase'
import {
  lookupAttendee,
  confirmCheckIn,
  undoCheckIn,
  getLiveStats,
  getRecentCheckIns,
} from './src/checkInHelper'

const { width } = Dimensions.get('window')
const SCAN_AREA_SIZE = width * 0.72

export default function App() {
  const [permission, requestPermission] = useCameraPermissions()
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'history'>('scan')
  const [torch, setTorch] = useState(false)
  const [scanned, setScanned] = useState(false)

  // Lookup & Modal state
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [attendee, setAttendee] = useState<Buyer | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Manual search state
  const [searchQuery, setSearchQuery] = useState('')

  // Stats & History
  const [stats, setStats] = useState({ checkedIn: 0, totalPaid: 0 })
  const [recentList, setRecentList] = useState<Buyer[]>([])
  const [bannerNotice, setBannerNotice] = useState<string | null>(null)

  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showBanner = (msg: string) => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current)
    setBannerNotice(msg)
    bannerTimeoutRef.current = setTimeout(() => {
      setBannerNotice(null)
    }, 3500)
  }

  // Load stats and recent history
  const refreshStats = useCallback(async () => {
    const s = await getLiveStats()
    setStats(s)
    const recents = await getRecentCheckIns(20)
    setRecentList(recents)
  }, [])

  useEffect(() => {
    refreshStats()
    const interval = setInterval(refreshStats, 6000)
    return () => clearInterval(interval)
  }, [refreshStats])

  // Handle scanned QR code
  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || modalVisible || loadingLookup) return

    setScanned(true)
    Vibration.vibrate(100)

    const rawData = result.data || ''
    await executeLookup(rawData)
  };

  const executeLookup = async (query: string) => {
    setLoadingLookup(true)
    setLookupError(null)
    setAttendee(null)
    setModalVisible(true)

    const { data, error } = await lookupAttendee(query)

    setLoadingLookup(false)
    if (error || !data) {
      setLookupError(error || 'Attendee not found')
      Vibration.vibrate([0, 150, 100, 150])
    } else {
      setAttendee(data)
    }
  }

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return
    await executeLookup(searchQuery.trim())
  }

  const handleConfirmArrival = async () => {
    if (!attendee) return
    setActionLoading(true)

    const { data, error } = await confirmCheckIn(attendee.id)
    setActionLoading(false)

    if (error || !data) {
      alert(`Check-in failed: ${error || 'Unknown error'}`)
    } else {
      Vibration.vibrate([0, 80, 50, 80])
      setAttendee(data)
      showBanner(`✅ ${data.name} marked as Arrived!`)
      refreshStats()

      // Close modal after brief confirmation
      setTimeout(() => {
        closeModal()
      }, 900)
    }
  }

  const handleUndoAttendee = async (buyerId: string, name: string) => {
    setActionLoading(true)
    const { error } = await undoCheckIn(buyerId)
    setActionLoading(false)

    if (error) {
      alert(`Failed to undo: ${error}`)
    } else {
      showBanner(`Check-in undone for ${name}`)
      refreshStats()
      if (modalVisible) closeModal()
    }
  }

  const closeModal = () => {
    setModalVisible(false)
    setAttendee(null)
    setLookupError(null)
    setScanned(false)
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Camera permissions check
  if (!permission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>CBA FORUM 2026</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>DOOR CHECK-IN</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Attendee Verification</Text>
        </View>

        {/* Live counter pill */}
        <View style={styles.counterBox}>
          <Text style={styles.counterValue}>{stats.checkedIn}</Text>
          <Text style={styles.counterLabel}>
            {stats.totalPaid > 0 ? `/ ${stats.totalPaid} ARRIVED` : 'ARRIVED'}
          </Text>
        </View>
      </View>

      {/* NOTIFICATION TOAST BANNER */}
      {bannerNotice && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastBannerText}>{bannerNotice}</Text>
        </View>
      )}

      {/* NAVIGATION TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'scan' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('scan')
            setScanned(false)
          }}
        >
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            📷 QR Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'manual' && styles.tabButtonActive]}
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
            🔍 Search by Name/Ticket
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('history')
            refreshStats()
          }}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            📋 Recent ({recentList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT AREA BASED ON TAB */}
      {activeTab === 'scan' && (
        <View style={styles.cameraWrapper}>
          {!permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permTitle}>Camera Permission Required</Text>
              <Text style={styles.permDesc}>
                The app needs camera access to scan ticket QR codes at the entrance.
              </Text>
              <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
                <Text style={styles.permButtonText}>Grant Camera Access</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permSubButton}
                onPress={() => setActiveTab('manual')}
              >
                <Text style={styles.permSubButtonText}>Use Manual Search Instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />

              {/* OVERLAY & VIEWFINDER */}
              <View style={styles.overlay}>
                <View style={styles.overlayTop}>
                  <Text style={styles.overlayHint}>
                    Align attendee ticket QR code inside the frame
                  </Text>
                </View>

                <View style={styles.viewfinderRow}>
                  <View style={styles.overlaySide} />
                  <View style={styles.viewfinder}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    <View style={styles.scanLaser} />
                  </View>
                  <View style={styles.overlaySide} />
                </View>

                <View style={styles.overlayBottom}>
                  <View style={styles.controlsRow}>
                    <TouchableOpacity
                      style={[styles.controlButton, torch && styles.controlButtonActive]}
                      onPress={() => setTorch(!torch)}
                    >
                      <Text style={styles.controlButtonText}>
                        {torch ? '⚡ Flash ON' : '💡 Flash OFF'}
                      </Text>
                    </TouchableOpacity>

                    {scanned && (
                      <TouchableOpacity
                        style={[styles.controlButton, styles.rescanButton]}
                        onPress={() => setScanned(false)}
                      >
                        <Text style={styles.controlButtonText}>🔄 Scan Next</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 2: MANUAL SEARCH */}
      {activeTab === 'manual' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Manual Attendee Lookup</Text>
          <Text style={styles.sectionSubtitle}>
            Search by Ticket Number (e.g. CBA-2026-0001), attendee Name, or Email
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. CBA-2026-0001 or John Doe"
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleManualSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleManualSearch}>
              <Text style={styles.searchButtonText}>Verify</Text>
            </TouchableOpacity>
          </View>

          {/* Quick preset chips */}
          <Text style={styles.presetsLabel}>Recent verified attendees:</Text>
          {recentList.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyCardMini}
              onPress={() => executeLookup(item.ticket_number || item.id)}
            >
              <View>
                <Text style={styles.historyName}>{item.name}</Text>
                <Text style={styles.historySub}>
                  {item.ticket_number || item.id.substring(0, 8)} • {item.company}
                </Text>
              </View>
              <Text style={styles.checkedBadge}>✓ Arrived</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* TAB 3: RECENT ARRIVALS */}
      {activeTab === 'history' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>Checked-In Attendees</Text>
            <TouchableOpacity onPress={refreshStats} style={styles.refreshIconBtn}>
              <Text style={styles.refreshIconText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            {recentList.length} verified attendee(s) at event entrance
          </Text>

          {recentList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🎟️</Text>
              <Text style={styles.emptyStateTitle}>No Check-Ins Yet</Text>
              <Text style={styles.emptyStateDesc}>
                Start scanning ticket QR codes to record arrivals in real time.
              </Text>
            </View>
          ) : (
            recentList.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyCardLeft}>
                  <View style={styles.avatarPill}>
                    <Text style={styles.avatarPillText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{item.name}</Text>
                    <Text style={styles.historyCompany}>
                      {item.designation ? `${item.designation} • ` : ''}
                      {item.company}
                    </Text>
                    <View style={styles.historyMetaRow}>
                      <Text style={styles.ticketBadgeText}>
                        {item.ticket_number || item.id.substring(0, 8)}
                      </Text>
                      {item.meal_preference && (
                        <Text style={styles.mealBadgeMini}>
                          {item.meal_preference === 'vegetarian' ? '🥦 Veg' : '🍖 Non-Veg'}
                        </Text>
                      )}
                      <Text style={styles.timeTag}>
                        ⏰ {formatTime(item.checked_in_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.undoBtn}
                  onPress={() => handleUndoAttendee(item.id, item.name)}
                >
                  <Text style={styles.undoBtnText}>Undo</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL: ATTENDEE VERIFICATION SHEET */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {loadingLookup ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.modalLoadingText}>Verifying ticket data...</Text>
              </View>
            ) : lookupError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorTitle}>Invalid or Unknown Ticket</Text>
                <Text style={styles.errorDesc}>{lookupError}</Text>
                <Text style={styles.errorHint}>
                  Please ensure the attendee purchased a ticket or try manual lookup.
                </Text>
                <TouchableOpacity style={styles.errorButton} onPress={closeModal}>
                  <Text style={styles.errorButtonText}>Scan Next Ticket</Text>
                </TouchableOpacity>
              </View>
            ) : attendee ? (
              <View>
                {/* ATTENDEE STATUS BANNER */}
                {attendee.checked_in ? (
                  <View style={styles.alreadyBanner}>
                    <Text style={styles.alreadyBannerTitle}>⚠️ ALREADY CHECKED IN</Text>
                    <Text style={styles.alreadyBannerSub}>
                      Arrival was recorded at {formatTime(attendee.checked_in_at) || 'earlier'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.verifiedBanner}>
                    <Text style={styles.verifiedBannerTitle}>✓ VALID TICKET CONFIRMED</Text>
                    <Text style={styles.verifiedBannerSub}>
                      Ready to confirm meeting attendance
                    </Text>
                  </View>
                )}

                {/* ATTENDEE DETAILS */}
                <View style={styles.attendeeDetailsCard}>
                  <Text style={styles.attendeeName}>{attendee.name}</Text>
                  <Text style={styles.attendeeCompany}>
                    {attendee.designation ? `${attendee.designation} at ` : ''}
                    {attendee.company}
                  </Text>

                  <View style={styles.divider} />

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>TICKET #</Text>
                      <Text style={styles.metaValueHighlight}>
                        {attendee.ticket_number || `CBA-${attendee.id.substring(0, 6)}`}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>PAYMENT</Text>
                      <View style={styles.paymentStatusPill}>
                        <Text style={styles.paymentStatusText}>
                          {attendee.payment_status.toUpperCase()} ✓
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>MEAL OPTION</Text>
                      <Text style={styles.metaValue}>
                        {attendee.meal_preference === 'vegetarian'
                          ? '🥦 Veg'
                          : attendee.meal_preference === 'non_vegetarian'
                          ? '🍖 Non-Veg'
                          : '🍽️ Standard'}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>MOBILE</Text>
                      <Text style={styles.metaValue}>{attendee.mobile || '—'}</Text>
                    </View>
                  </View>

                  {attendee.meal_notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Special Requests:</Text>
                      <Text style={styles.notesText}>{attendee.meal_notes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* ACTION BUTTONS */}
                {!attendee.checked_in ? (
                  <TouchableOpacity
                    style={[styles.confirmButton, actionLoading && styles.btnDisabled]}
                    onPress={handleConfirmArrival}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        ✅ CONFIRM ARRIVAL (CHECK-IN)
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.alreadyActionRow}>
                    <TouchableOpacity
                      style={styles.reconfirmButton}
                      onPress={handleConfirmArrival}
                      disabled={actionLoading}
                    >
                      <Text style={styles.reconfirmButtonText}>Update Timestamp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.undoCheckinButton}
                      onPress={() => handleUndoAttendee(attendee.id, attendee.name)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.undoCheckinButtonText}>Undo Check-In</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Dismiss / Next Scan</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  eventBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  livePillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  counterBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  counterValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  counterLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  toastBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  overlayTop: {
    paddingTop: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayHint: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewfinderRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewfinder: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanLaser: {
    position: 'absolute',
    top: '50%',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  overlayBottom: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#475569',
  },
  controlButtonActive: {
    backgroundColor: '#eab308',
    borderColor: '#ca8a04',
  },
  rescanButton: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  permDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  permSubButton: {
    paddingVertical: 12,
  },
  permSubButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 18,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 22,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  presetsLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshIconBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  refreshIconText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarPillText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '800',
  },
  historyName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyCompany: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ticketBadgeText: {
    color: '#60a5fa',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  mealBadgeMini: {
    color: '#a7f3d0',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  timeTag: {
    color: '#64748b',
    fontSize: 10,
  },
  undoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  undoBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  historyCardMini: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySub: {
    color: '#64748b',
    fontSize: 12,
  },
  checkedBadge: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoadingText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 15,
  },
  modalErrorBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorDesc: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  verifiedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedBannerTitle: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedBannerSub: {
    color: '#a7f3d0',
    fontSize: 12,
    marginTop: 2,
  },
  alreadyBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  alreadyBannerTitle: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '800',
  },
  alreadyBannerSub: {
    color: '#fde68a',
    fontSize: 12,
    marginTop: 2,
  },
  attendeeDetailsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  attendeeName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  attendeeCompany: {
    color: '#94a3b8',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    width: '47%',
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  metaValue: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
  },
  metaValueHighlight: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentStatusText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  notesBox: {
    marginTop: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  notesLabel: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  notesText: {
    color: '#fef3c7',
    fontSize: 12,
  },
  confirmButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#16a34a',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  alreadyActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  reconfirmButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reconfirmButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  undoCheckinButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  undoCheckinButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
})
