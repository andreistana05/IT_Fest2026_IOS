/**
 * One-time migration: populate emergencyContacts arrays from existing
 * monitored-contacts subcollections.
 *
 * For every user U that has contacts in users/{U}/contacts:
 *   - find the Firestore user whose phone matches each contact's phone
 *   - add U's UID to that owner's emergencyContacts array
 *
 * Run once with:  node migrate-emergency-contacts.js
 */

const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
} = require('firebase/firestore');

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

async function migrate() {
  console.log('Starting emergencyContacts migration...\n');

  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Found ${usersSnap.size} users.\n`);

  let updated = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const followerUid = userDoc.id;
    const contactsSnap = await getDocs(collection(db, 'users', followerUid, 'contacts'));

    if (contactsSnap.empty) continue;

    for (const contactDoc of contactsSnap.docs) {
      const phone = contactDoc.data().phone;
      if (!phone) { skipped++; continue; }

      const norm = String(phone).replace(/[^0-9+]/g, '');

      // Try original phone value first, then normalised
      let ownerDocs = (await getDocs(query(collection(db, 'users'), where('phone', '==', phone)))).docs;
      if (ownerDocs.length === 0 && norm !== phone) {
        ownerDocs = (await getDocs(query(collection(db, 'users'), where('phone', '==', norm)))).docs;
      }

      if (ownerDocs.length === 0) {
        console.log(`  No user found for phone ${phone} (monitored by ${followerUid}) — skipping`);
        skipped++;
        continue;
      }

      for (const ownerDoc of ownerDocs) {
        await updateDoc(ownerDoc.ref, { emergencyContacts: arrayUnion(followerUid) });
        console.log(`  Added ${followerUid} → emergencyContacts of ${ownerDoc.id} (phone: ${phone})`);
        updated++;
      }
    }
  }

  console.log(`\nDone. ${updated} entries added, ${skipped} skipped.`);
}

migrate().catch(e => { console.error(e); process.exit(1); });
