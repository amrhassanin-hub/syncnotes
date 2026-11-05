/**
 * Group Management Service
 * 
 * Handles creating groups, inviting members, listening to groups in real-time,
 * and caching AI synthesis per group.
 * 
 * Resilient Architecture:
 * - Always preserves groups in local reactive storage first so the user is NEVER blocked
 * - Seamlessly synchronizes to Cloud Firestore when live Firebase is active
 * - Gracefully falls back to local storage if Firestore security rules are locked
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import type { Group, GroupMember, AISynthesis } from '../types';
import { PRESET_TEAMMATES } from './authService';

const DEMO_GROUPS_KEY = 'syncnotes_demo_groups';
const DEMO_SYNTHESIS_KEY = 'syncnotes_demo_synthesis';

// Initial pre-seeded group
const DEFAULT_GROUP: Group = {
  id: 'group-product-sprint-2026',
  name: '⚡ Product Launch Sprint',
  description: 'Team notes for Q4 app launch, marketing, design, and architecture',
  createdBy: 'demo-current-user',
  createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  members: [
    {
      uid: 'demo-current-user',
      email: 'alex.rivera@syncnotes.demo',
      displayName: 'Alex Rivera',
      role: 'owner',
    },
    {
      uid: PRESET_TEAMMATES[0].uid,
      email: PRESET_TEAMMATES[0].email,
      displayName: PRESET_TEAMMATES[0].displayName,
      role: 'member',
    },
    {
      uid: PRESET_TEAMMATES[1].uid,
      email: PRESET_TEAMMATES[1].email,
      displayName: PRESET_TEAMMATES[1].displayName,
      role: 'member',
    },
  ],
  memberUids: ['demo-current-user', PRESET_TEAMMATES[0].uid, PRESET_TEAMMATES[1].uid],
};

export function getLocalGroups(): Group[] {
  try {
    const raw = localStorage.getItem(DEMO_GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify([DEFAULT_GROUP]));
  return [DEFAULT_GROUP];
}

export function saveLocalGroups(groups: Group[]) {
  try {
    localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error(e);
  }
  notifyGroupSubscribers();
}

type GroupListener = (groups: Group[]) => void;
const groupSubscribers = new Set<GroupListener>();

function notifyGroupSubscribers() {
  const groups = getLocalGroups();
  groupSubscribers.forEach((cb) => cb(groups));
}

export async function createGroup(
  name: string,
  description: string,
  user: { uid: string; email: string; displayName: string }
): Promise<Group> {
  const authUid = auth?.currentUser?.uid || user.uid;

  const newGroup: Group = {
    id: 'grp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    description: description.trim(),
    createdBy: authUid,
    createdAt: Date.now(),
    members: [
      {
        uid: authUid,
        email: user.email,
        displayName: user.displayName,
        role: 'owner',
      },
    ],
    memberUids: [authUid, user.uid].filter((v, i, a) => a.indexOf(v) === i),
  };

  // 1. Always save locally first so the user is NEVER blocked from creating/using groups
  const current = getLocalGroups();
  current.unshift(newGroup);
  saveLocalGroups(current);

  // 2. Try to sync to Cloud Firestore if configured
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'groups', newGroup.id);
      await setDoc(docRef, newGroup);
      console.log('✅ Group synced to Cloud Firestore:', newGroup.name);
    } catch (fbErr: any) {
      console.warn('⚠️ Cloud Firestore write blocked (permissions or network):', fbErr?.message || fbErr);
      // Group is already preserved locally! Disclose friendly notice rather than crashing
      if (fbErr?.code === 'permission-denied' || fbErr?.message?.includes('permission')) {
        console.info(
          '💡 Tip: To sync across devices, publish firestore.rules in Firebase Console > Firestore Database > Rules.'
        );
      }
    }
  }

  return newGroup;
}

export async function inviteMemberToGroup(groupId: string, memberEmail: string): Promise<GroupMember> {
  const cleanEmail = memberEmail.trim().toLowerCase();
  const displayName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  
  const newMember: GroupMember = {
    uid: 'invited-' + Date.now().toString(36),
    email: cleanEmail,
    displayName,
    role: 'member',
  };

  // 1. Update local storage
  const current = getLocalGroups();
  const group = current.find((g) => g.id === groupId);
  if (group) {
    const already = group.members.some((m) => m.email.toLowerCase() === cleanEmail);
    if (!already) {
      group.members.push(newMember);
      group.memberUids.push(newMember.uid);
      saveLocalGroups(current);
    }
  }

  // 2. Sync to Cloud Firestore if available
  if (db && isFirebaseConfigured) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(newMember),
        memberUids: arrayUnion(newMember.uid),
      });
    } catch (err: any) {
      console.warn('⚠️ Could not sync invite to Cloud Firestore:', err?.message || err);
    }
  }

  return newMember;
}

export function subscribeToGroups(userUid: string, callback: GroupListener): () => void {
  // Always subscribe to local updates
  groupSubscribers.add(callback);

  // Deliver initial local data immediately
  callback(getLocalGroups());

  let unsubscribeFirestore: (() => void) | null = null;

  if (db && isFirebaseConfigured) {
    try {
      const currentUid = auth?.currentUser?.uid || userUid;
      const q = query(collection(db, 'groups'), where('memberUids', 'array-contains', currentUid));
      
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const firestoreGroups: Group[] = [];
          snapshot.forEach((d) => firestoreGroups.push(d.data() as Group));
          
          if (firestoreGroups.length > 0) {
            // Merge with local groups
            const local = getLocalGroups();
            const map = new Map<string, Group>();
            local.forEach((g) => map.set(g.id, g));
            firestoreGroups.forEach((g) => map.set(g.id, g));
            
            const merged = Array.from(map.values());
            saveLocalGroups(merged);
            callback(merged);
          }
        },
        (err) => {
          console.warn('⚠️ Firestore group subscription notice (using local groups):', err?.message || err);
          callback(getLocalGroups());
        }
      );
    } catch (err) {
      console.warn('Could not initialize Firestore onSnapshot listener:', err);
    }
  }

  return () => {
    groupSubscribers.delete(callback);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

// Synthesis caching
export async function saveGroupSynthesis(synthesis: AISynthesis): Promise<void> {
  // Always cache locally
  try {
    const key = `${DEMO_SYNTHESIS_KEY}_${synthesis.groupId}`;
    localStorage.setItem(key, JSON.stringify(synthesis));
  } catch (e) {
    console.error(e);
  }

  // Try Firestore sync
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'groups', synthesis.groupId, 'meta', 'ai_synthesis');
      await setDoc(docRef, synthesis);
    } catch (e: any) {
      console.warn('Could not cache synthesis to Firestore:', e?.message || e);
    }
  }
}

export async function getGroupSynthesis(groupId: string): Promise<AISynthesis | null> {
  // Try Firestore first
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'groups', groupId, 'meta', 'ai_synthesis');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as AISynthesis;
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback to local storage
  try {
    const key = `${DEMO_SYNTHESIS_KEY}_${groupId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}
