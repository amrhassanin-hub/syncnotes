/**
 * Notes Service
 * 
 * Handles creating, updating, deleting notes, listening in real-time with onSnapshot,
 * and uploading audio / photo media to Firebase Storage (with base64 offline fallback).
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './config';
import type { Note, NoteType } from '../types';
import { PRESET_TEAMMATES } from './authService';

const DEMO_NOTES_KEY = 'syncnotes_demo_notes';

// Pre-seeded sample notes for immediate rich experience
const INITIAL_DEMO_NOTES: Note[] = [
  {
    id: 'note-sara-1',
    groupId: 'group-product-sprint-2026',
    authorId: PRESET_TEAMMATES[0].uid,
    authorName: PRESET_TEAMMATES[0].displayName,
    authorEmail: PRESET_TEAMMATES[0].email,
    type: 'text',
    content: 'Client onboarding design review: We need an instant 3-step walkthrough. Agreed to keep the progress bar visible at all times. Target launch date confirmed for next Friday.',
    isPrivate: false,
    createdAt: Date.now() - 3600 * 1000 * 18,
  },
  {
    id: 'note-marcus-1',
    groupId: 'group-product-sprint-2026',
    authorId: PRESET_TEAMMATES[1].uid,
    authorName: PRESET_TEAMMATES[1].displayName,
    authorEmail: PRESET_TEAMMATES[1].email,
    type: 'audio',
    content: 'Voice memo from backend architecture sync with DevOps team.',
    transcript: 'We decided on Firebase free tier for initial rollout with Firestore caching. Cloud functions will proxy Gemini calls to protect the API key. Marcus will set up database indexes by Wednesday afternoon.',
    isPrivate: false,
    createdAt: Date.now() - 3600 * 1000 * 12,
  },
  {
    id: 'note-alex-1',
    groupId: 'group-product-sprint-2026',
    authorId: 'demo-current-user',
    authorName: 'Alex Rivera',
    authorEmail: 'alex.rivera@syncnotes.demo',
    type: 'text',
    content: 'Mobile PWA requirements: Must support offline draft mode and camera capture directly from mobile Safari and Chrome. Let us test audio recording on low-bandwidth connections.',
    isPrivate: false,
    createdAt: Date.now() - 3600 * 1000 * 6,
  },
  {
    id: 'note-sara-2',
    groupId: 'group-product-sprint-2026',
    authorId: PRESET_TEAMMATES[0].uid,
    authorName: PRESET_TEAMMATES[0].displayName,
    authorEmail: PRESET_TEAMMATES[0].email,
    type: 'photo',
    content: 'Whiteboard mockup diagram from morning brainstorm.',
    photoUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
    isPrivate: false,
    createdAt: Date.now() - 3600 * 1000 * 2,
  },
  {
    id: 'note-alex-private',
    groupId: 'group-product-sprint-2026',
    authorId: 'demo-current-user',
    authorName: 'Alex Rivera',
    authorEmail: 'alex.rivera@syncnotes.demo',
    type: 'text',
    content: '🔒 Private note: Personal salary review notes and reminder to book doctor appointment. (Hidden from teammates and AI synthesis).',
    isPrivate: true,
    createdAt: Date.now() - 3600 * 1000 * 1,
  },
];

function getLocalNotes(): Note[] {
  try {
    const raw = localStorage.getItem(DEMO_NOTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(INITIAL_DEMO_NOTES));
  return INITIAL_DEMO_NOTES;
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(notes));
  notifyNotesSubscribers();
}

type NotesListener = (notes: Note[]) => void;
const notesSubscribers = new Map<string, Set<NotesListener>>();

function notifyNotesSubscribers() {
  const allNotes = getLocalNotes();
  notesSubscribers.forEach((subscribers, groupId) => {
    const groupNotes = allNotes
      .filter((n) => n.groupId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt);
    subscribers.forEach((cb) => cb(groupNotes));
  });
}

/**
 * Upload an audio Blob or photo File to Firebase Storage.
 * Falls back to base64 Data URL if Firebase is not yet configured.
 */
export async function uploadMediaFile(
  file: Blob | File,
  path: string
): Promise<string> {
  if (storage && isFirebaseConfigured) {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }

  // Fallback: convert to base64 Data URL so it is viewable/playable offline and locally
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function addNote(noteData: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  const note: Note = {
    ...noteData,
    id: 'nt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    createdAt: Date.now(),
  };

  // 1. Always save locally first
  const current = getLocalNotes();
  current.unshift(note);
  saveLocalNotes(current);

  // 2. Sync to Cloud Firestore if available
  if (db && isFirebaseConfigured) {
    try {
      const noteRef = doc(db, 'groups', note.groupId, 'notes', note.id);
      await setDoc(noteRef, note);
    } catch (fbErr: any) {
      console.warn('⚠️ Could not sync note to Cloud Firestore (saved locally):', fbErr?.message || fbErr);
    }
  }

  return note;
}

export async function updateNote(groupId: string, noteId: string, updates: Partial<Note>): Promise<void> {
  // 1. Update local storage
  const current = getLocalNotes();
  const index = current.findIndex((n) => n.id === noteId);
  if (index !== -1) {
    current[index] = { ...current[index], ...updates, updatedAt: Date.now() };
    saveLocalNotes(current);
  }

  // 2. Sync to Cloud Firestore
  if (db && isFirebaseConfigured) {
    try {
      const noteRef = doc(db, 'groups', groupId, 'notes', noteId);
      await setDoc(noteRef, { ...updates, updatedAt: Date.now() }, { merge: true });
    } catch (e: any) {
      console.warn('Could not sync update to Cloud Firestore:', e?.message || e);
    }
  }
}

export async function deleteNote(groupId: string, noteId: string): Promise<void> {
  // 1. Update local storage
  const current = getLocalNotes();
  const filtered = current.filter((n) => n.id !== noteId);
  saveLocalNotes(filtered);

  // 2. Sync to Cloud Firestore
  if (db && isFirebaseConfigured) {
    try {
      const noteRef = doc(db, 'groups', groupId, 'notes', noteId);
      await deleteDoc(noteRef);
    } catch (e: any) {
      console.warn('Could not sync delete to Cloud Firestore:', e?.message || e);
    }
  }
}

/**
 * Real-time listener for a group's notes.
 * Calls callback whenever any teammate or user adds, edits, or deletes a note.
 */
export function subscribeToGroupNotes(
  groupId: string,
  callback: (notes: Note[]) => void
): () => void {
  // Always subscribe to local updates
  if (!notesSubscribers.has(groupId)) {
    notesSubscribers.set(groupId, new Set());
  }
  const subs = notesSubscribers.get(groupId)!;
  subs.add(callback);

  // Send initial data immediately
  const allNotes = getLocalNotes();
  const groupNotes = allNotes
    .filter((n) => n.groupId === groupId)
    .sort((a, b) => b.createdAt - a.createdAt);
  callback(groupNotes);

  let unsubscribeFirestore: (() => void) | null = null;

  if (db && isFirebaseConfigured) {
    try {
      const notesRef = collection(db, 'groups', groupId, 'notes');
      const q = query(notesRef, orderBy('createdAt', 'desc'));

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const cloudNotes: Note[] = [];
          snapshot.forEach((docSnap) => {
            cloudNotes.push(docSnap.data() as Note);
          });

          if (cloudNotes.length > 0) {
            // Merge with local notes
            const currentAll = getLocalNotes();
            const map = new Map<string, Note>();
            currentAll.forEach((n) => map.set(n.id, n));
            cloudNotes.forEach((n) => map.set(n.id, n));
            const merged = Array.from(map.values());
            saveLocalNotes(merged);

            const thisGroup = merged
              .filter((n) => n.groupId === groupId)
              .sort((a, b) => b.createdAt - a.createdAt);
            callback(thisGroup);
          }
        },
        (error) => {
          console.warn('⚠️ Firestore onSnapshot notice (using local notes):', error?.message || error);
        }
      );
    } catch (err) {
      console.warn('Could not set up Firestore notes listener:', err);
    }
  }

  return () => {
    subs.delete(callback);
    if (subs.size === 0) {
      notesSubscribers.delete(groupId);
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}
