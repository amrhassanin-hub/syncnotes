import React, { useState } from 'react';
import { createGroup, inviteMemberToGroup, getLocalGroups, saveLocalGroups } from '../firebase/groupService';
import type { Group, UserProfile } from '../types';
import { Users, Plus, X, Mail, Sparkles, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  currentUser: UserProfile;
  currentGroup?: Group | null;
  mode: 'create' | 'invite';
  onClose: () => void;
  onGroupCreated?: (group: Group) => void;
  onMemberInvited?: (email: string) => void;
}

export const CreateGroupModal: React.FC<Props> = ({
  isOpen,
  currentUser,
  currentGroup,
  mode,
  onClose,
  onGroupCreated,
  onMemberInvited,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const group = await createGroup(name, description, currentUser);
      onGroupCreated?.(group);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentGroup) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await inviteMemberToGroup(currentGroup.id, inviteEmail);
      setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
      onMemberInvited?.(inviteEmail);
      setInviteEmail('');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to invite member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {mode === 'create' ? 'Create New Group' : `Invite to ${currentGroup?.name || 'Group'}`}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'create'
                  ? 'Collaborate with teammates on shared notes'
                  : 'Add team members by their email address'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <span>{errorMsg}</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                If your Firebase Firestore rules are currently locked in the Firebase Console, you can create and use this group locally immediately:
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const localGroup = {
                      id: 'grp-' + Date.now().toString(36),
                      name: name.trim() || 'My Group',
                      description: description.trim(),
                      createdBy: currentUser.uid,
                      createdAt: Date.now(),
                      members: [
                        {
                          uid: currentUser.uid,
                          email: currentUser.email,
                          displayName: currentUser.displayName,
                          role: 'owner' as const,
                        },
                      ],
                      memberUids: [currentUser.uid],
                    };
                    const all = getLocalGroups();
                    all.unshift(localGroup);
                    saveLocalGroups(all);
                    onGroupCreated?.(localGroup);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                >
                  Create Group Locally
                </button>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Redesign, House Project, Trip to Tokyo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this group working on together?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teammate's Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  They will automatically see this group when logging in with this email.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
