/**
 * Firebase Initialization & Configuration Helper
 * 
 * In production or when Firebase credentials are provided in .env (or in-app setup),
 * this initializes the real Firebase SDK (Auth, Firestore, Storage).
 * 
 * If credentials are not yet entered, it enables "Demo / Local Sync Mode" so you can
 * immediately test multi-member notes, audio recording, photo notes, and AI synthesis
 * without any roadblock!
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfigParams {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = 'syncnotes_firebase_custom_config';

export function getStoredFirebaseConfig(): FirebaseConfigParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read custom Firebase config:', e);
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigParams | null) {
  if (config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  // Reload page to re-initialize SDK
  window.location.reload();
}

// Check environment variables first, then localStorage
const storedConfig = getStoredFirebaseConfig();
export const firebaseConfig: FirebaseConfigParams = {
  apiKey: storedConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: storedConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: storedConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: storedConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: storedConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: storedConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'MY_FIREBASE_API_KEY'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig as Record<string, string>) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('🔥 Firebase initialized successfully with project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('Could not initialize Firebase SDK, falling back to Demo Mode:', err);
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

export { app, auth, db, storage };
