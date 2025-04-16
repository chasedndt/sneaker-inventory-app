// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with error handling
let firebaseApp;
let auth: Auth;
let analytics;

try {
  // Initialize the Firebase app with the config
  firebaseApp = initializeApp(firebaseConfig);
  
  // Initialize Firebase Authentication
  auth = getAuth(firebaseApp);
  
  // Initialize Analytics if available
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(firebaseApp);
  }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw new Error('Failed to initialize Firebase. Check your configuration.');
}

export { auth, analytics };
export default firebaseApp;