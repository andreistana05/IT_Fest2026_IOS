# FallDetector — iOS Companion App

FallDetector is a two-part fall-detection system. The **Android app** (separate repository) runs on the device of the person at risk — it continuously monitors accelerometer data and detects falls in real time. This repository contains the **iOS companion app**, which receives instant alerts when a fall is detected and lets the user send an emergency SOS with their GPS location.

---

## How it works

```
Android device (person at risk)
        │
        │  fall detected → POST /alert  {phone, lat, lng, …}
        ▼
   Node.js server
        │
        │  looks up phone_index/{phone} in Firestore
        │  writes alert to users/{uid}/alerts  for every follower
        │  sends Expo push notification to each follower's device
        ▼
   iOS companion app  ←─ push notification + Firestore live listener
```

1. The person at risk carries an Android phone with the FallDetector Android app installed. Their phone number is registered in the system.
2. When a fall is detected, the Android app calls the server's `/alert` endpoint with the phone number and GPS coordinates.
3. The server looks up who is monitoring that phone number (`phone_index` collection in Firestore) and writes an alert document to each follower's subcollection.
4. Each follower receives a push notification on their iOS device and can see the alert in the app immediately.

---

## Features

### Alert monitoring
- Receive instant push notifications when someone you monitor has a fall detected on their Android device.
- A red banner appears at the top of the home screen with the time of the last alert.
- All received alerts are stored and viewable in the **Alert History** screen.

### Fall map
- Tap **Fall Map** to see every recorded fall plotted on an interactive map with GPS pins.

### SOS — I fell
- If you yourself have fallen and need help, tap **I fell — alert my contacts**.
- The app fetches your saved emergency contacts from Firestore, composes a message with your current GPS coordinates (Apple Maps + Google Maps links), and opens the native Messages app pre-addressed to all your contacts at once using `expo-sms`.
- Your location is also saved to your own alert history.

### Contacts management
- Add the phone numbers of the people you want to monitor under **Monitored contacts**.
- Each number is indexed in Firestore so the server knows to route alerts to you when that person falls.
- Use the **Check** button to verify whether a number is correctly registered in the system.
- Remove contacts at any time; the index is cleaned up automatically.

### Live location tracking
- Your current GPS coordinates are displayed on the home screen and updated continuously while the app is open.
- Location is also saved to your Firestore profile so others can see your last known position.

### User profile
- View and edit your display name, phone number, and profile photo.
- Your phone number is what other iOS users enter when they want to monitor you.

---

## Architecture

| Layer | Technology |
|---|---|
| iOS app | React Native + Expo (SDK 54), Expo Router |
| Push notifications | Expo Push Notification Service |
| Backend | Node.js + Express (`/server`) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage (profile photos) |

### Firestore structure

```
users/
  {uid}/
    email, name, phone, fcmToken, photoURL, lastLatitude, lastLongitude
    contacts/      ← people this user monitors (their phone numbers)
    alerts/        ← fall alerts received by this user

phone_index/
  {normalised_phone}/
    followers: [uid, uid, …]   ← UIDs of everyone monitoring this number
```

### Server endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/alert` | Receive a fall event from an Android device, fan out to all followers |
| POST | `/register-token` | Register an Expo push token (legacy, in-memory) |
| POST | `/send-notification` | Broadcast a push to all in-memory tokens (legacy) |

---

## Getting started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- An iOS device or simulator (push notifications require a physical device)
- A Firebase project with Firestore, Authentication, and Storage enabled

### 1. Clone and install

```bash
git clone https://github.com/andreistana05/IT_Fest2026_IOS.git
cd IT_Fest2026_IOS
npm install
```

### 2. Configure Firebase

The Firebase config is already set in `app/lib/firebase.tsx`. If you are using your own Firebase project, replace the `firebaseConfig` object with your own credentials.

### 3. Start the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** (limited — push notifications won't work) or build a development client:

```bash
npx expo run:ios
```

### 4. Start the server

```bash
cd server
npm install
node index.js
```

The server listens on port `3001` by default. The Android app must be configured to point to this server's public URL.

---

## Usage guide

1. **Create an account** — register with your email, password, and phone number. Your phone number is how the Android app identifies you as someone to alert.
2. **Add contacts to monitor** — go to **Monitored contacts** and enter the phone numbers of people who have the Android app installed. Their number must match what is registered on their device (include the country code, e.g. `+40712345678`).
3. **Enable push notifications** — the app will request permission on first launch. This is required to receive fall alerts.
4. **Wait for alerts** — if anyone you monitor falls, you will receive a push notification immediately. The alert banner will appear on the home screen and the event will be saved to your alert history.
5. **Send SOS** — if you have fallen yourself, tap **I fell — alert my contacts**. Your GPS location will be sent by SMS to all your saved contacts instantly.
