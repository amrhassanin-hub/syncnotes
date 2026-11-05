import React, { useState } from 'react';
import { loginWithEmail, signUpWithEmail, PRESET_TEAMMATES, switchDemoUser } from '../firebase/authService';
import { isFirebaseConfigured } from '../firebase/config';
import type { UserProfile } from '../types';
import { Sparkles, Mail, Lock, User, LogIn, ArrowRight, ShieldCheck, Users } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSuccess: (user: UserProfile) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onSuccess, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error('Please enter your name.');
        }
        const user = await signUpWithEmail(email, password, displayName);
        onSuccess(user);
      } else {
        const user = await loginWithEmail(email, password);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoUser = (user: UserProfile) => {
    switchDemoUser(user);
    onSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner mb-3">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">SyncNotes</h2>
          <p className="text-xs text-indigo-100 mt-1 max-w-xs mx-auto">
            Collaborative note-taking synthesized with Google Gemini AI
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>

          {/* Quick Demo Accounts for Immediate Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Instant Demo Sign-in:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelectDemoUser({
                    uid: 'demo-current-user',
                    email: 'alex.rivera@syncnotes.demo',
                    displayName: 'Alex Rivera',
                  })
                }
                className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition text-xs group"
              >
                <div className="font-bold text-slate-800 group-hover:text-indigo-700">Alex R.</div>
                <div className="text-[10px] text-slate-400">Owner</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser(PRESET_TEAMMATES[0])}
                className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition text-xs group"
              >
                <div className="font-bold text-slate-800 group-hover:text-indigo-700">Sara C.</div>
                <div className="text-[10px] text-slate-400">Designer</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser(PRESET_TEAMMATES[1])}
                className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition text-xs group"
              >
                <div className="font-bold text-slate-800 group-hover:text-indigo-700">Marcus V.</div>
                <div className="text-[10px] text-slate-400">DevOps</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
