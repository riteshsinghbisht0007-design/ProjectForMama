import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();

// Check if a live, valid Firebase API key has been supplied
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== 'demo-api-key' &&
  !rawApiKey.toLowerCase().includes('dummy') &&
  !rawApiKey.toLowerCase().includes('your_') &&
  !rawApiKey.toLowerCase().includes('placeholder') &&
  rawApiKey.length > 20
);

// Official project configuration
const defaultFirebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : 'AIzaSyDemoPlaceholderKeyForLocalDevOnly00',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'projectformama-6df71.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'projectformama-6df71',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'projectformama-6df71.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '266505592306',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:266505592306:web:c7d1d404e6039a165cdf6b',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-59B1KN7W0K',
};

// Initialize or reuse Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(defaultFirebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Creates and configures a fresh GoogleAuthProvider instance.
 * Setting `prompt: 'select_account'` forces Google OAuth to display the account chooser
 * every time, allowing the user to select an account or switch to a different Google account.
 */
export const createGoogleAuthProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  provider.addScope('email');
  provider.addScope('profile');
  return provider;
};

export const googleProvider = createGoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');

export {
  // Auth primitives
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type FirebaseUser,
  
  // Storage primitives
  storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};
