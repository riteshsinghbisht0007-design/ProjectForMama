import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
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
import firebaseConfigJson from '../../firebase-applet-config.json';

// Official project configuration loaded from provisioned firebase-applet-config.json
const rawApiKey = (firebaseConfigJson.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '').trim();

// Check if a live, valid Firebase API key has been supplied
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== 'demo-api-key' &&
  !rawApiKey.toLowerCase().includes('dummy') &&
  !rawApiKey.toLowerCase().includes('your_') &&
  !rawApiKey.toLowerCase().includes('placeholder') &&
  rawApiKey.length > 20
);

export const defaultFirebaseConfig = {
  apiKey: rawApiKey || 'AIzaSyDemoPlaceholderKeyForLocalDevOnly00',
  authDomain: firebaseConfigJson.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'yielding-drake-lvxch.firebaseapp.com',
  projectId: firebaseConfigJson.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yielding-drake-lvxch',
  storageBucket: firebaseConfigJson.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'yielding-drake-lvxch.firebasestorage.app',
  messagingSenderId: firebaseConfigJson.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '399137617746',
  appId: firebaseConfigJson.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:399137617746:web:b03625b176096da1012c8b',
  measurementId: firebaseConfigJson.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize or reuse Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(defaultFirebaseConfig);
export const auth = getAuth(app);

// Use specified custom Firestore database ID if provided, otherwise default
const customDbId = firebaseConfigJson.firestoreDatabaseId;
export const db = customDbId && customDbId !== '(default)'
  ? getFirestore(app, customDbId)
  : getFirestore(app);

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

  // Firestore primitives
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type DocumentSnapshot,
};

