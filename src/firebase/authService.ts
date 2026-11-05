/**
 * Authentication Service
 * 
 * Handles email/password sign up, login, user display name, and logout.
 * Works with live Firebase Auth or local demo mode when Firebase is not yet configured.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';
import type { UserProfile } from '../types';

const DEMO_USER_KEY = 'syncnotes_demo_current_user';
const DEMO_ALL_USERS_KEY = 'syncnotes_demo_all_users';

// Pre-seeded demo members so you can test teammate tabs immediately!
export const PRESET_TEAMMATES: UserProfile[] = [
  {
    uid: 'demo-user-sara',
    email: 'sara.chen@syncnotes.demo',
    displayName: 'Sara Chen',
  },
  {
    uid: 'demo-user-marcus',
    email: 'marcus.v@syncnotes.demo',
    displayName: 'Marcus Vance',
  },
  {
    uid: 'demo-user-elena',
    email: 'elena.rostova@syncnotes.demo',
    displayName: 'Elena Rostova',
  },
];

// Helper to get demo users from localStorage
function getDemoUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(DEMO_ALL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  const initial = [
    {
      uid: 'demo-current-user',
      email: 'alex.rivera@syncnotes.demo',
      displayName: 'Alex Rivera',
    },
    ...PRESET_TEAMMATES,
  ];
  localStorage.setItem(DEMO_ALL_USERS_KEY, JSON.stringify(initial));
  return initial;
}

// Current logged in demo user
function getStoredDemoUser(): UserProfile {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  const defaultUser = getDemoUsers()[0];
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

// Listeners for demo auth changes
type AuthCallback = (user: UserProfile | null) => void;
const authSubscribers = new Set<AuthCallback>();

function notifyAuthSubscribers(user: UserProfile | null) {
  authSubscribers.forEach((cb) => cb(user));
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      await updateProfile(credential.user, { displayName });
    }
    return {
      uid: credential.user.uid,
      email: credential.user.email || email,
      displayName: displayName || email.split('@')[0],
      photoURL: credential.user.photoURL || undefined,
    };
  }

  // Demo mode
  const users = getDemoUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: UserProfile = {
    uid: 'user-' + Date.now().toString(36),
    email,
    displayName: displayName.trim() || email.split('@')[0],
  };

  users.push(newUser);
  localStorage.setItem(DEMO_ALL_USERS_KEY, JSON.stringify(users));
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
  notifyAuthSubscribers(newUser);
  return newUser;
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: credential.user.uid,
      email: credential.user.email || email,
      displayName: credential.user.displayName || credential.user.email?.split('@')[0] || 'User',
      photoURL: credential.user.photoURL || undefined,
    };
  }

  // Demo mode
  const users = getDemoUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    // If not found, create one conveniently for easy testing
    const newUser: UserProfile = {
      uid: 'user-' + Date.now().toString(36),
      email,
      displayName: email.split('@')[0],
    };
    users.push(newUser);
    localStorage.setItem(DEMO_ALL_USERS_KEY, JSON.stringify(users));
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
    notifyAuthSubscribers(newUser);
    return newUser;
  }

  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(found));
  notifyAuthSubscribers(found);
  return found;
}

export async function logoutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await signOut(auth);
    return;
  }

  // In demo mode, clearing session
  localStorage.removeItem(DEMO_USER_KEY);
  notifyAuthSubscribers(null);
}

export function switchDemoUser(targetUser: UserProfile) {
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(targetUser));
  notifyAuthSubscribers(targetUser);
}

export function subscribeToAuth(callback: AuthCallback): () => void {
  authSubscribers.add(callback);

  if (auth && isFirebaseConfigured) {
    const unsub = fbOnAuthStateChanged(auth, (fbUser: User | null) => {
      if (fbUser) {
        callback({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL || undefined,
        });
      } else {
        // Fallback to local stored user so user is never locked out of testing
        const current = getStoredDemoUser();
        callback(current);
      }
    });

    return () => {
      authSubscribers.delete(callback);
      unsub();
    };
  }

  // Demo mode
  authSubscribers.add(callback);
  const current = getStoredDemoUser();
  callback(current);

  return () => {
    authSubscribers.delete(callback);
  };
}
