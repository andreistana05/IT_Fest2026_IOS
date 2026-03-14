const express = require('express');
const { Expo } = require('expo-server-sdk');
const fs = require('fs');
const path = require('path');
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.warn('firebase-admin not installed or failed to load. Alert routing to Firestore will be disabled.');
}
// Twilio removed per request — SMS/call functionality disabled

const app = express();
app.use(express.json());

const expo = new Expo();
const tokens = new Set();

// Load contacts (simple JSON file). Edit server/contacts.json to change who gets alerts.
let contacts = [];
try {
  const contactsPath = path.join(__dirname, 'contacts.json');
  if (fs.existsSync(contactsPath)) contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
} catch (err) {
  console.error('Failed to load contacts.json', err);
}

// Twilio configuration removed — no longer used
const twilioClient = null;

// Initialize Firebase Admin if available
let firestore = null;
try {
  if (admin) {
    const saPath = path.join(__dirname, 'serviceAccountKey.json');
    let serviceAccount = null;
    if (fs.existsSync(saPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      firestore = admin.firestore();
      console.log('Firebase Admin initialized for server Firestore operations.');
    } else {
      console.warn('No service account for firebase-admin found. Server alert routing disabled.');
    }
  }
} catch (e) {
  console.error('Failed to initialize firebase-admin', e);
}

app.post('/register-token', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  tokens.add(token);
  console.log('Registered token:', token);
  res.json({ ok: true });
});

app.post('/send-notification', async (req, res) => {
  if (tokens.size === 0) return res.status(400).json({ error: 'no tokens registered' });

  const messages = [];
  for (const pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid token: ${pushToken}`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      body: 'Emergency: possible fall detected. Please check on the user.',
      data: { type: 'fall_alert' },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    res.json({ ok: true, tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// New endpoint: receive an alert (from Android device) and notify contacts via SMS and voice call
app.post('/alert', async (req, res) => {
  const { phone, message, callerName, location, lat, lng, timestamp } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const norm = String(phone).replace(/[^0-9+]/g, '');
  console.log('ALERT received for phone', norm, { message, callerName, location, lat, lng, timestamp });

  if (!firestore) {
    console.warn('Firestore not configured on server — cannot route alert to followers.');
    return res.json({ ok: true, routed: 0, warning: 'firestore-not-configured' });
  }

  try {
    const idxDoc = await firestore.doc(`phone_index/${norm}`).get();
    const followers = idxDoc.exists ? (idxDoc.data().followers || []) : [];
    if (!followers || followers.length === 0) {
      return res.json({ ok: true, routed: 0 });
    }

    const payload = {
      phone: norm,
      callerName: callerName || null,
      message: message || null,
      location: location || null,
      coords: lat && lng ? { lat, lng } : null,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'android-webhook',
    };

    let routed = 0;
    for (const uid of followers) {
      try {
        await firestore.collection('users').doc(uid).collection('alerts').add(payload);
        routed++;
      } catch (e) {
        console.warn('Failed to write alert for', uid, e);
      }
    }

    return res.json({ ok: true, routed });
  } catch (e) {
    console.error('Alert routing failed', e);
    return res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
