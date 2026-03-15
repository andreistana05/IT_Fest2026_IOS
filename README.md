# FallDetector — iOS App

FallDetector is an iOS app that alerts your emergency contacts the moment a fall is detected, and lets you send an SOS with your GPS location via SMS. It also stores a medical record that is automatically included in every SOS message to help first responders.

---

## How it works

```
Fall detected on monitored device
        │
        │  POST /alert  {phone, callerName, lat, lng, …}
        ▼
   Node.js server  (./server)
        │
        │  looks up phone_index/{phone} in Firestore
        │  writes alert to users/{uid}/alerts for every follower
        ▼
   FallDetector iOS app  ←─ Firestore real-time listener (onSnapshot)
```

1. The person at risk registers with their phone number in the app.
2. When a fall is detected, their device calls the server's `/alert` endpoint with the phone number and GPS coordinates.
3. The server looks up who is monitoring that number (`phone_index` collection) and writes an alert document to each follower's subcollection.
4. Each follower sees the alert appear in real time in their Alert History and Fall Map.

---

## Features

### SOS — I fell
- Tap **I fell — alert my contacts** to send an emergency SMS to every saved contact with your current GPS coordinates (Apple Maps + Google Maps links).
- If you have a medical record filled in, it is automatically appended to the SMS so first responders have your conditions, allergies, and medication at a glance.
- The SOS is also fanned out to all users who are monitoring your phone number — it appears in their Alert History and on their Fall Map with your name on it.
- The event is saved to your own alert history.

### Medical record
- Go to the **Medical** tab to store your medical conditions, allergies, and current medication.
- This information is included automatically in every SOS message you send — no extra steps needed.

### Alert monitoring
- When someone you monitor falls, an alert appears in your **Alert History** in real time via Firestore live listeners.
- A red banner is shown on the home screen with the time of the last alert.

### Fall map
- Tap **Fall Map** to see every recorded fall plotted on an interactive map.
- Each pin shows the contact's name, timestamp, and GPS coordinates.

### Contacts management
- Add the phone numbers of people you want to monitor under **Monitored contacts**.
- When you add someone, you are automatically added to their `emergencyContacts` list in Firestore.
- Each number is indexed in `phone_index` so the server knows to route their alerts to you.
- Use the **Check** button to verify a number is registered in the system.
- Removing a contact cleans up both the index and the emergency contacts list.

### Live location tracking
- Your GPS coordinates are displayed on the home screen and updated continuously while the app is open.
- Location is saved to your Firestore profile in real time.

### User profile
- View and edit your display name and phone number.
- Your phone number is what other users enter to monitor you — keep it up to date with the country code (e.g. `+40712345678`).

---

## Architecture

| Layer | Technology |
|---|---|
| iOS app | React Native + Expo (SDK 54), Expo Router |
| Backend | Node.js + Express (`/server`) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| SMS | expo-sms (native Messages app) |
| Maps | react-native-maps |
| Location | expo-location |

### Firestore structure

```
users/
  {uid}/
    email, name, phone, photoURL
    lastLatitude, lastLongitude, createdAt
    medicalConditions, allergies, medication
    emergencyContacts: [uid, uid, …]   ← UIDs of users monitoring this person
    contacts/      ← subcollection: phone numbers this user monitors
    alerts/        ← subcollection: fall alerts received by this user

phone_index/
  {normalised_phone}/
    followers: [uid, uid, …]   ← UIDs of everyone monitoring this number
```

### Server endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/alert` | Receive a fall event and fan out alert docs to all followers |

---

## Getting started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A physical iOS device
- A Firebase project with Firestore and Authentication enabled

### 1. Clone and install

```bash
git clone https://github.com/andreistana05/IT_Fest2026_IOS.git
cd IT_Fest2026_IOS
npm install
```

### 2. Configure Firebase

The Firebase config is already set in `app/lib/firebase.tsx`. If you are using your own Firebase project, replace the `firebaseConfig` object with your own credentials (and update it in `server/index.js` as well).

### 3. Start the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** or build a development client:

```bash
npx expo run:ios
```

### 4. Start the server

```bash
cd server
npm install
node index.js
```

The server listens on port `3001` by default. The device sending fall alerts must be configured to point to this server's public URL.

---

## Usage guide

1. **Create an account** — register with your email, password, name, and phone number. Your phone number is how the system identifies you.
2. **Fill in your medical record** — go to the **Medical** tab and add your conditions, allergies, and medication. This will be sent automatically in every SOS.
3. **Add contacts to monitor** — go to **Monitored contacts** and enter phone numbers of people to watch over. Use the country code (e.g. `+40712345678`). You will be added to their emergency contacts list automatically.
4. **Wait for alerts** — if anyone you monitor falls, the alert appears in your Alert History and Fall Map in real time.
5. **Send SOS** — if you have fallen, tap **I fell — alert my contacts**. Your GPS location and medical info are sent by SMS to all your contacts instantly.
