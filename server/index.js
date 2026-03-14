const express = require('express');
const { Expo } = require('expo-server-sdk');
const fs = require('fs');
const path = require('path');
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
  const { message, callerName, location } = req.body || {};
  const body = message || `${callerName || 'Un contact'}: potential fall detected.` + (location ? ` Location: ${location}` : '');

  // Device-SMS approach selected: server simply records the alert and returns OK.
  // The Android app should send an SMS directly from the user's device; this endpoint can be used
  // for logging or for push-based workflows if you change approach later.
  console.log('ALERT received:', { message, callerName, location, receivedAt: new Date().toISOString() });
  res.json({ ok: true, logged: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
