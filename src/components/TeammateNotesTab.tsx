import React from 'react';
import type { GroupMember, Note, UserProfile } from '../types';
import { NoteCard } from './NoteCard';
import { ShieldCheck, UserCheck, Inbox, Lock } from 'lucide-react';

interface Props {
  teammate: GroupMember;
  notes: Note[];
  currentUser: UserProfile;
}

export const TeammateNotesTab: React.FC<Props> = ({ teammate, notes, currentUser }) => {
  // Only public notes by this teammate
  const teammateNotes = notes.filter(
    (n) => n.authorId === teammate.uid && !n.isPrivate
  );

  return (
    <div className="space-y-6">
      {/* Teammate Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base">
            {teammate.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                {teammate.displayName}'s Notes
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                Read-only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{teammate.email}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Private notes are kept private to {teammate.displayName}</span>
        </div>
      </div>

      {/* Notes List */}
      {teammateNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-2">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-700 text-sm">No Shared Notes Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {teammate.displayName} hasn't posted any shared notes in this group yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teammateNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};
