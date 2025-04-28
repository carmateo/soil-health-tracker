// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration using environment variables
// Ensure these variables are defined in your .env.local or environment
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Basic validation to check if environment variables are loaded
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your environment.");
}
if (!firebaseConfig.authDomain) {
  console.error("Firebase Auth Domain is missing. Ensure NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set in your environment.");
}
// Add similar checks for other essential config variables if needed


// Initialize Firebase
// Check if Firebase app already exists to avoid reinitialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Solo exportamos una vez
export { app, auth, db };
