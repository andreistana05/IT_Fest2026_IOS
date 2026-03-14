import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

// Firebase project config (from your google-services JSON).
const firebaseConfig = {
  apiKey: 'AIzaSyDwbc1qk0irgEf85mBxBzv0r07U6ERG6UI',
  authDomain: 'falldetector-3d0f4.firebaseapp.com',
  projectId: 'falldetector-3d0f4',
  storageBucket: 'falldetector-3d0f4.firebasestorage.app',
  messagingSenderId: '39630339843',
  appId: '1:39630339843:android:746869ca30a181d02f3336',
};

if (!getApps().length) {
  initializeApp(firebaseConfig as any);
}

export const auth = getAuth();
export const db = getFirestore();

export async function saveUserProfile(opts: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  fcmToken?: string | null;
  createdAt?: number | any;
}) {
  const { uid, email = null, name = null, phone = null, fcmToken = null, createdAt } = opts;
  const ref = doc(db, 'users', uid);

  const createdAtValue = typeof createdAt === 'number' && createdAt > 0
    ? Timestamp.fromMillis(createdAt)
    : serverTimestamp();

  const payload = {
    uid,
    email,
    name,
    phone,
    fcmToken,
    createdAt: createdAtValue,
  } as any;

  await setDoc(ref, payload, { merge: true });
  return payload;
}
