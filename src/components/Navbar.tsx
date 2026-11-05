import React, { useState } from 'react';
import type { Group, UserProfile } from '../types';
import { isFirebaseConfigured } from '../firebase/config';
import { PRESET_TEAMMATES, switchDemoUser, logoutUser } from '../firebase/authService';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Sparkles,
  ChevronDown,
  Plus,
  Flame,
  CheckCircle,
  Users,
  LogOut,
  UserCheck,
  Radio,
  FileText
} from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  groups: Group[];
  activeGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onCreateGroupClick: () => void;
  onOpenFirebaseModal: () => void;
  onOpenAuthModal: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  groups,
  activeGroup,
  onSelectGroup,
  onCreateGroupClick,
  onOpenFirebaseModal,
  onOpenAuthModal,
  isSyncing,
}) => {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Group Selector */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                SyncNotes
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                AI Collaborative Notes
              </div>
            </div>
          </div>

          {/* Group Picker Dropdown */}
          {currentUser && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-200/60 transition max-w-[150px] sm:max-w-[220px] truncate"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{activeGroup ? activeGroup.name : 'Select Group'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {showGroupMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowGroupMenu(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Your Groups
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            onSelectGroup(g);
                            setShowGroupMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                            activeGroup?.id === g.id
                              ? 'bg-indigo-50/70 text-indigo-700 font-bold'
                              : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{g.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {g.members?.length || 1} members
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-1 mt-1 border-t border-slate-100 px-1.5">
                      <button
                        onClick={() => {
                          setShowGroupMenu(false);
                          onCreateGroupClick();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Group
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Real-time Sync Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-600 text-[11px] font-medium border border-slate-200/40">
          <span
            className={`w-2 h-2 rounded-full ${
              isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span>{isSyncing ? 'Syncing...' : 'Synced in real-time'}</span>
        </div>

        {/* Right: PWA Install, Firebase Badge, User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* In-App PWA Install */}
          <PWAInstallButton />

          {/* Firebase Setup Indicator Button */}
          <button
            onClick={onOpenFirebaseModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              isFirebaseConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="Configure or inspect Firebase connection"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden lg:inline">
              {isFirebaseConfigured ? 'Firebase Connected' : 'Demo Mode (Click for Setup)'}
            </span>
            <span className="lg:hidden text-[11px]">
              {isFirebaseConfigured ? 'Live' : 'Demo'}
            </span>
          </button>

          {/* User Profile / Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white shadow-xl border border-slate-100 p-2 z-20 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="font-bold text-xs text-slate-800 truncate">
                        {currentUser.displayName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {currentUser.email}
                      </div>
                    </div>

                    {/* Quick identity switcher in demo mode */}
                    {!isFirebaseConfigured && (
                      <div className="py-2 border-b border-slate-100">
                        <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Switch Teammate Identity:
                        </div>
                        <button
                          onClick={() => {
                            switchDemoUser({
                              uid: 'demo-current-user',
                              email: 'alex.rivera@syncnotes.demo',
                              displayName: 'Alex Rivera',
                            });
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span>Alex Rivera (You)</span>
                          {currentUser.displayName === 'Alex Rivera' && (
                            <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                        </button>
                        {PRESET_TEAMMATES.map((t) => (
                          <button
                            key={t.uid}
                            onClick={() => {
                              switchDemoUser(t);
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{t.displayName} (Teammate)</span>
                            {currentUser.uid === t.uid && (
                              <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logoutUser();
                        onOpenAuthModal();
                      }}
                      className="w-full text-left px-3 py-2 mt-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out / Switch Account
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
