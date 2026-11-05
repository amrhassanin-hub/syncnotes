/**
 * SyncNotes - Collaborative Note-Taking Web App with Gemini AI Synthesis
 * 
 * Mobile-first collaborative notes application where:
 * 1. Each member has a personal notes tab ("Me")
 * 2. Members can view teammates' read-only tabs
 * 3. Gemini AI synthesizes all shared notes into a shared "Main" tab
 * 4. Members can ask the AI questions grounded in all notes with citations
 * 5. Text, Audio memos (with Web Speech API transcript), and Photo notes
 * 6. 🔒 Private toggle isolates sensitive notes from teammates and AI
 * 7. Real-time updates with Firestore onSnapshot + offline draft preservation
 */

import React, { useState, useEffect } from 'react';
import type { Group, Note, UserProfile } from './types';
import { subscribeToAuth } from './firebase/authService';
import { subscribeToGroups } from './firebase/groupService';
import {
  subscribeToGroupNotes,
  deleteNote,
  updateNote,
} from './firebase/notesService';
import { Navbar } from './components/Navbar';
import { OfflineBanner } from './components/OfflineBanner';
import { GroupTabs } from './components/GroupTabs';
import { NoteComposer } from './components/NoteComposer';
import { NoteCard } from './components/NoteCard';
import { MainAITab } from './components/MainAITab';
import { TeammateNotesTab } from './components/TeammateNotesTab';
import { CreateGroupModal } from './components/CreateGroupModal';
import { FirebaseSetupModal } from './components/FirebaseSetupModal';
import { AuthModal } from './components/AuthModal';
import {
  Lock,
  Globe,
  Sparkles,
  User,
  Plus,
  Users,
  Inbox,
  Filter
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<string>('main'); // 'main' | 'me' | teammateUid
  const [notes, setNotes] = useState<Note[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<'create' | 'invite'>('create');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Me tab filter: 'all' | 'public' | 'private'
  const [meFilter, setMeFilter] = useState<'all' | 'public' | 'private'>('all');

  // 1. Subscribe to Auth State
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Groups when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setGroups([]);
      setActiveGroup(null);
      return;
    }

    const unsubscribe = subscribeToGroups(currentUser.uid, (loadedGroups) => {
      setGroups(loadedGroups);
      if (loadedGroups.length > 0) {
        // Keep active group if valid, otherwise select first
        setActiveGroup((prev) => {
          if (prev && loadedGroups.some((g) => g.id === prev.id)) {
            return loadedGroups.find((g) => g.id === prev.id) || loadedGroups[0];
          }
          return loadedGroups[0];
        });
      } else {
        setActiveGroup(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Subscribe to Real-time Notes for activeGroup
  useEffect(() => {
    if (!activeGroup) {
      setNotes([]);
      return;
    }

    setIsSyncing(true);
    const unsubscribe = subscribeToGroupNotes(activeGroup.id, (loadedNotes) => {
      setNotes(loadedNotes);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [activeGroup?.id]);

  // Note actions
  const handleDeleteNote = async (noteId: string) => {
    if (!activeGroup) return;
    try {
      await deleteNote(activeGroup.id, noteId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePrivate = async (noteId: string, isPrivate: boolean) => {
    if (!activeGroup) return;
    try {
      await updateNote(activeGroup.id, noteId, { isPrivate });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditContent = async (noteId: string, newContent: string) => {
    if (!activeGroup) return;
    try {
      await updateNote(activeGroup.id, noteId, { content: newContent });
    } catch (e) {
      console.error(e);
    }
  };

  // Get notes for "Me" tab
  const myNotes = currentUser
    ? notes.filter((n) => n.authorId === currentUser.uid)
    : [];

  const filteredMyNotes = myNotes.filter((n) => {
    if (meFilter === 'public') return !n.isPrivate;
    if (meFilter === 'private') return n.isPrivate;
    return true;
  });

  // Current selected teammate if in a teammate tab
  const activeTeammate = activeGroup?.members?.find((m) => m.uid === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-safe">
      {/* Offline Alert Banner */}
      <OfflineBanner />

      {/* Header & Navbar */}
      <Navbar
        currentUser={currentUser}
        groups={groups}
        activeGroup={activeGroup}
        onSelectGroup={(g) => {
          setActiveGroup(g);
          setActiveTab('main');
        }}
        onCreateGroupClick={() => {
          setGroupModalMode('create');
          setIsCreateGroupOpen(true);
        }}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      {currentUser && activeGroup ? (
        <>
          {/* Group Navigation Tabs */}
          <GroupTabs
            group={activeGroup}
            currentUser={currentUser}
            notes={notes}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
            onInviteClick={() => {
              setGroupModalMode('invite');
              setIsCreateGroupOpen(true);
            }}
          />

          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
            {/* TAB 1: ✨ Main (AI) Tab */}
            {activeTab === 'main' && (
              <MainAITab group={activeGroup} notes={notes} />
            )}

            {/* TAB 2: Me (Editable) Tab */}
            {activeTab === 'me' && (
              <div className="space-y-6">
                {/* Note Composer at the top */}
                <NoteComposer
                  groupId={activeGroup.id}
                  currentUser={currentUser}
                  onNoteAdded={() => {
                    // onSnapshot listener automatically receives the new note
                  }}
                />

                {/* Filter and Count Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">
                      My Notes ({myNotes.length})
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      • {myNotes.filter((n) => !n.isPrivate).length} shared, {myNotes.filter((n) => n.isPrivate).length} private
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      onClick={() => setMeFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        meFilter === 'all'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setMeFilter('public')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        meFilter === 'public'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Shared
                    </button>
                    <button
                      onClick={() => setMeFilter('private')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        meFilter === 'private'
                          ? 'bg-white text-rose-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Private
                    </button>
                  </div>
                </div>

                {/* List of my notes */}
                {filteredMyNotes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                    <h3 className="font-semibold text-slate-700 text-sm">
                      {meFilter === 'all' ? 'No notes yet' : `No ${meFilter} notes`}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Use the composer above to write text, record audio memos, or upload photos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMyNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        currentUser={currentUser}
                        onDelete={handleDeleteNote}
                        onTogglePrivate={handleTogglePrivate}
                        onEditContent={handleEditContent}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Teammate Read-Only Tab */}
            {activeTab !== 'main' && activeTab !== 'me' && activeTeammate && (
              <TeammateNotesTab
                teammate={activeTeammate}
                notes={notes}
                currentUser={currentUser}
              />
            )}
          </main>
        </>
      ) : !currentUser ? (
        /* Empty / Signed out state */
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome to SyncNotes
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Personal note tabs for each teammate, with Gemini AI synthesizing everything into a shared overview and answering your questions.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
            >
              Sign In or Try Instant Demo
            </button>
          </div>
        </main>
      ) : (
        /* No group created yet */
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Create Your First Group
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Groups bring teammates together. Each member gets their own note tab, and the AI synthesizes all public notes in the Main tab.
            </p>
            <button
              onClick={() => {
                setGroupModalMode('create');
                setIsCreateGroupOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create a Group
            </button>
          </div>
        </main>
      )}

      {/* Modals */}
      {currentUser && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          currentUser={currentUser}
          currentGroup={activeGroup}
          mode={groupModalMode}
          onClose={() => setIsCreateGroupOpen(false)}
          onGroupCreated={(group) => {
            setActiveGroup(group);
            setActiveTab('me');
          }}
        />
      )}

      <FirebaseSetupModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
