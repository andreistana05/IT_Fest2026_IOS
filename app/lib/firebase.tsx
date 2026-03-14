import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace the values below with your Firebase project config.
// Do NOT commit real credentials to source control. For local development
// consider using environment variables or a .env file.
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
