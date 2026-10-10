# CBA Forum – Event Day Check-In App (Expo)

Mobile app for event door staff to scan QR tickets and verify attendee arrival in real-time.

---

## 📱 How to Run the Mobile App

### Step 1: Open Terminal in the App Folder
```bash
cd "d:\prageeth\CBA Forum\checkin-app"
```
*(Or inside `d:\prageeth\CBA Forum\ticket 1\checkin-app`)*

### Step 2: Start Expo
```bash
npx expo start
```

### Step 3: Open on Your Phone
1. Install **Expo Go** from Google Play Store (Android) or Apple App Store (iOS).
2. Scan the QR code shown in your terminal / browser with:
   - **Android**: The Expo Go app's built-in scanner.
   - **iOS**: The native Camera app (opens in Expo Go).

---

## ✨ Features

1. **Camera QR Code Scanner**:
   - Point camera at attendee's printed ticket or phone screen.
   - Instantly decodes ticket number and pulls attendee record from Supabase.
   - Flashlight / Torch toggle button for dim entrance areas.
   - Haptic vibration feedback on successful detection.

2. **Verification & Check-In Action**:
   - Displays attendee's name, company, position, meal choice, and payment status.
   - Prevents duplicate entries: shows warning if ticket was already checked in (including timestamp).
   - Door staff taps **"✅ CONFIRM ARRIVAL (CHECK-IN)"** to record arrival in Supabase.

3. **Manual Lookup Fallback**:
   - If attendee doesn't have their ticket or screen is unreadable, door staff can search by **Name**, **Email**, or **Ticket Number**.

4. **Recent Arrivals & Undo**:
   - View history of everyone checked in at the door.
   - Tap **"Undo"** if a ticket was checked in by mistake.

5. **Real-time Web Admin Sync**:
   - The web app's **"Check-In"** tab polls every 5 seconds, updating attendee counts and arrivals automatically without manual browser refresh.
