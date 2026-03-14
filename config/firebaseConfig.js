// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Date extrase din proiectul FallDetector
const firebaseConfig = {
  apiKey: "AIzaSyDwbc1qk0irgEf85mBxBzv0r07U6ERG6UI",
  authDomain: "falldetector-3d0f4.firebaseapp.com",
  projectId: "falldetector-3d0f4",
  storageBucket: "falldetector-3d0f4.firebasestorage.app",
  messagingSenderId: "39630339843",
  appId: "1:39630339843:android:746869ca30a181d02f3336", // Recomandat să generezi unul de Web în consolă
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);