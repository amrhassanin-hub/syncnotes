import React from 'react';
import type { Group, GroupMember, Note, UserProfile } from '../types';
import { Sparkles, User, Users, UserPlus } from 'lucide-react';

interface Props {
  group: Group;
  currentUser: UserProfile;
  notes: Note[];
  activeTab: string; // 'main' | 'me' | memberUid
  onTabChange: (tabId: string) => void;
  onInviteClick: () => void;
}

export const GroupTabs: React.FC<Props> = ({
  group,
  currentUser,
  notes,
  activeTab,
  onTabChange,
  onInviteClick,
}) => {
  // Count my notes
  const myNotesCount = notes.filter((n) => n.authorId === currentUser.uid).length;

  // Filter other teammates
  const teammates = (group.members || []).filter((m) => m.uid !== currentUser.uid);

  return (
    <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-xs">
      {/* Group Title and Invite Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">
              {group.name}
            </h1>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
              {group.members?.length || 1} {group.members?.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {group.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5 max-w-xl">
              {group.description}
            </p>
          )}
        </div>

        {/* Invite Teammate Button */}
        <button
          onClick={onInviteClick}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Invite Member</span>
          <span className="sm:hidden">Invite</span>
        </button>
      </div>

      {/* Tabs list (horizontally scrollable on mobile) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 pt-1">
        {/* ✨ Main (AI) Tab */}
        <button
          onClick={() => onTabChange('main')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
            activeTab === 'main'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'main' ? 'text-amber-300' : 'text-indigo-600'}`} />
          <span>Main (AI)</span>
        </button>

        {/* Me (editable) Tab */}
        <button
          onClick={() => onTabChange('me')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
            activeTab === 'me'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Me (Editable)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'me'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {myNotesCount}
          </span>
        </button>

        {/* Read-only tab per teammate */}
        {teammates.map((teammate) => {
          const teammateNotesCount = notes.filter(
            (n) => n.authorId === teammate.uid && !n.isPrivate
          ).length;
          const isActive = activeTab === teammate.uid;

          return (
            <button
              key={teammate.uid}
              onClick={() => onTabChange(teammate.uid)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isActive ? 'bg-indigo-400 text-slate-900' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {teammate.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[120px]">{teammate.displayName}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {teammateNotesCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
