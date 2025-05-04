
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collectionGroup } from "firebase/firestore"; // Import collectionGroup

// Your web app's Firebase configuration (hardcoded)
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyC818GwGLx8xjAmuDfa-qZGy4sfW-SqX70",
  authDomain: "soil-health-tracking-8a00a.firebaseapp.com",
  projectId: "soil-health-tracking-8a00a",
  storageBucket: "soil-health-tracking-8a00a.appspot.com",
  messagingSenderId: "274758012410",
  appId: "1:274758012410:web:7c243efb1ab4c589a66843"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export initialized services and collectionGroup
export { app, auth, db, collectionGroup };

    