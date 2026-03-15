const express = require('express');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDwbc1qk0irgEf85mBxBzv0r07U6ERG6UI',
  authDomain: 'falldetector-3d0f4.firebaseapp.com',
  projectId: 'falldetector-3d0f4',
  storageBucket: 'falldetector-3d0f4.firebasestorage.app',
  messagingSenderId: '39630339843',
  appId: '1:39630339843:android:746869ca30a181d02f3336',
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

const app = express();
app.use(express.json());

// Receive a fall alert and fan it out to all followers in Firestore
app.post('/alert', async (req, res) => {
  const { phone, message, callerName, location, lat, lng, timestamp } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const norm = String(phone).replace(/[^0-9+]/g, '');
  console.log('ALERT received for phone', norm, { message, callerName, location, lat, lng, timestamp });

  try {
    const idxSnap = await getDoc(doc(db, 'phone_index', norm));
    const followers = idxSnap.exists() ? (idxSnap.data().followers || []) : [];
    if (followers.length === 0) return res.json({ ok: true, routed: 0 });

    const payload = {
      contactPhone: norm,
      contactName: callerName || null,
      message: message || null,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      receivedAt: serverTimestamp(),
      source: 'webhook',
    };

    let routed = 0;
    for (const uid of followers) {
      try {
        await addDoc(collection(db, 'users', uid, 'alerts'), payload);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
