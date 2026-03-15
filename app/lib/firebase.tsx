import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


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
export const storage = getStorage();

export async function saveUserProfile(opts: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  createdAt?: number | any;
}) {
  const { uid, createdAt } = opts;
  const ref = doc(db, 'users', uid);

  const createdAtValue = typeof createdAt === 'number' && createdAt > 0
    ? Timestamp.fromMillis(createdAt)
    : serverTimestamp();

  // Only write fields that were explicitly provided — avoids overwriting
  // existing data (e.g. phone) when only one field is being updated.
  const payload: any = { uid, createdAt: createdAtValue };
  if ('email' in opts) payload.email = opts.email ?? null;
  if ('name' in opts) payload.name = opts.name ?? null;
  if ('phone' in opts) payload.phone = opts.phone ?? null;
  if ('photoURL' in opts) payload.photoURL = opts.photoURL ?? null;

  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function saveUserLocation(uid: string, latitude: number, longitude: number) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { lastLatitude: latitude, lastLongitude: longitude }, { merge: true });
}

export async function saveMedicalRecord(uid: string, opts: {
  medicalConditions?: string | null;
  allergies?: string | null;
  medication?: string | null;
}) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    medicalConditions: opts.medicalConditions ?? null,
    allergies: opts.allergies ?? null,
    medication: opts.medication ?? null,
  }, { merge: true });
}
