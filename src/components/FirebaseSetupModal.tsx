import React, { useState } from 'react';
import {
  isFirebaseConfigured,
  firebaseConfig,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  type FirebaseConfigParams,
} from '../firebase/config';
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  ExternalLink,
  RotateCcw,
  Shield,
  Copy,
  Check,
  Key
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FIRESTORE_PRODUCTION_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isGroupMember(groupId) {
      return request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids;
    }

    match /groups/{groupId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.memberUids;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.memberUids;
      allow update: if request.auth != null && request.auth.uid in resource.data.memberUids;
      allow delete: if request.auth != null && resource.data.createdBy == request.auth.uid;

      match /notes/{noteId} {
        allow read: if isGroupMember(groupId) && 
          (!resource.data.isPrivate || resource.data.authorId == request.auth.uid);
        allow create: if isGroupMember(groupId) && 
          request.resource.data.authorId == request.auth.uid;
        allow update, delete: if isGroupMember(groupId) && 
          resource.data.authorId == request.auth.uid;
      }

      match /meta/{metaDoc} {
        allow read, write: if isGroupMember(groupId);
      }
    }
  }
}`;

const FIRESTORE_QUICK_TEST_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Allows quick testing for 30 days while developing
      allow read, write: if request.time < timestamp.date(2027, 1, 1);
    }
  }
}`;

export const FirebaseSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const stored = getStoredFirebaseConfig();
  const [formData, setFormData] = useState<FirebaseConfigParams>({
    apiKey: stored?.apiKey || firebaseConfig.apiKey || '',
    authDomain: stored?.authDomain || firebaseConfig.authDomain || '',
    projectId: stored?.projectId || firebaseConfig.projectId || '',
    storageBucket: stored?.storageBucket || firebaseConfig.storageBucket || '',
    messagingSenderId: stored?.messagingSenderId || firebaseConfig.messagingSenderId || '',
    appId: stored?.appId || firebaseConfig.appId || '',
  });

  const [activeTab, setActiveTab] = useState<'status' | 'rules' | 'config' | 'guide'>('status');
  const [copiedRules, setCopiedRules] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredFirebaseConfig(formData);
  };

  const handleResetDemo = () => {
    saveStoredFirebaseConfig(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRules(label);
    setTimeout(() => setCopiedRules(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 text-slate-900 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Firebase Configuration</h2>
              <p className="text-xs text-slate-400">Backend, Database &amp; Security Rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-2 gap-1.5 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 transition shrink-0 ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Current Status
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Firestore Rules (Fix Permissions)</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition shrink-0 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            API Credentials
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition shrink-0 ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Step-by-Step Guide
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* TAB 1: Status */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  isFirebaseConfigured
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                }`}
              >
                {isFirebaseConfigured ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {isFirebaseConfigured
                      ? 'Live Firebase Connected'
                      : 'Running in Demo & Local Sync Mode'}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {isFirebaseConfigured
                      ? `SyncNotes is connected to project "${firebaseConfig.projectId}". Notes and groups sync across devices with local backup.`
                      : 'All features (multi-member notes, audio recording, photo attachments, speech-to-text, and Gemini AI synthesis) are fully functional using local reactive storage with pre-seeded teammates.'}
                  </p>
                </div>
              </div>

              {isFirebaseConfigured && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Seeing "Missing or insufficient permissions"?</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    By default, new Firestore databases block all reads/writes until you publish security rules.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rules')}
                    className="mt-1 font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    View &amp; Copy Firestore Rules &rarr;
                  </button>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Firebase Auth:</span>
                  <span className="font-semibold text-slate-700">
                    {isFirebaseConfigured ? 'Live Firebase Auth' : 'Simulated (Multi-user demo accounts)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Firestore Database:</span>
                  <span className="font-semibold text-slate-700">
                    {isFirebaseConfigured ? 'Live Firestore onSnapshot' : 'Reactive Local Store'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Local Offline Safeguard:</span>
                  <span className="font-semibold text-emerald-600">Active (Never lose notes)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Gemini AI Engine:</span>
                  <span className="font-semibold text-indigo-600">
                    Server-side gemini-2.5-flash / gemini-3.8-flash
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                >
                  Configure Firebase Credentials
                </button>
                {isFirebaseConfigured && (
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="w-full py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Demo Mode
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Rules (Fix Permissions) */}
          {activeTab === 'rules' && (
            <div className="space-y-4 text-xs text-slate-600 max-h-96 overflow-y-auto pr-1">
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-indigo-950 space-y-1.5">
                <h4 className="font-bold text-xs text-indigo-900">How to Fix "Missing or insufficient permissions":</h4>
                <div className="p-2 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-950 text-[11px] font-medium">
                  ⚠️ <strong>Important distinction:</strong> In the Firebase sidebar, click <strong>"Firestore Database"</strong>, NOT <strong>"Realtime Database"</strong> (RTDB). SyncNotes is built on Cloud Firestore.
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-indigo-900/90 leading-relaxed pt-1">
                  <li>
                    Open{' '}
                    <a
                      href={
                        formData.projectId
                          ? `https://console.firebase.google.com/project/${formData.projectId}/firestore/rules`
                          : 'https://console.firebase.google.com'
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-indigo-700 inline-flex items-center gap-1"
                    >
                      Firebase Console &gt; Firestore Database &gt; Rules <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Copy one of the rule sets below.</li>
                  <li>Paste into the Firebase Rules editor and click <strong>"Publish"</strong>!</li>
                </ol>
              </div>

              {/* Quick Testing Rules */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Option A: Quick Development Rules (Easiest)</span>
                    <span className="text-[11px] text-slate-500">Allows reads &amp; writes for testing with friends</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(FIRESTORE_QUICK_TEST_RULES, 'test')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                  >
                    {copiedRules === 'test' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Test Rules
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-slate-100 text-[11px] rounded-lg font-mono overflow-x-auto">
                  {FIRESTORE_QUICK_TEST_RULES}
                </pre>
              </div>

              {/* Production Rules */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Option B: Production Multi-User Rules</span>
                    <span className="text-[11px] text-slate-500">Strict member isolation &amp; private note protection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(FIRESTORE_PRODUCTION_RULES, 'prod')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs"
                  >
                    {copiedRules === 'prod' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Prod Rules
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-slate-100 text-[10px] rounded-lg font-mono overflow-x-auto max-h-40">
                  {FIRESTORE_PRODUCTION_RULES}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Config */}
          {activeTab === 'config' && (
            <form onSubmit={handleSave} className="space-y-3">
              <p className="text-xs text-slate-500">
                Paste your web app keys from <strong>Firebase Console &gt; Project Settings &gt; General &gt; Your Apps</strong>:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  API Key (apiKey)
                </label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={formData.apiKey || ''}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="my-syncnotes-app"
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    placeholder="project.firebaseapp.com"
                    value={formData.authDomain || ''}
                    onChange={(e) => setFormData({ ...formData, authDomain: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Storage Bucket
                  </label>
                  <input
                    type="text"
                    placeholder="project.appspot.com"
                    value={formData.storageBucket || ''}
                    onChange={(e) => setFormData({ ...formData, storageBucket: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    placeholder="1:123456789:web:abcdef"
                    value={formData.appId || ''}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
                >
                  Save &amp; Reload App
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
                >
                  Reset Demo
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-600 max-h-80 overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-900 block">1. Create a Free Firebase Project</span>
                <p>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold inline-flex items-center gap-1">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a> and click "Add project".</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-900 block">2. Enable Authentication</span>
                <p>In sidebar, go to <strong>Build &gt; Authentication</strong> &gt; Get Started &gt; enable <strong>Email/Password</strong> provider.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-900 block">3. Enable Cloud Firestore &amp; Rules</span>
                <p>Go to <strong>Build &gt; Firestore Database</strong> &gt; Create Database. Then in the <strong>Rules</strong> tab, paste the rules from the "Firestore Rules" tab above and click "Publish".</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-900 block">4. Enable Cloud Storage</span>
                <p>Go to <strong>Build &gt; Storage</strong> &gt; Get Started to store audio recordings and photo notes.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-900 block">5. Register Web App</span>
                <p>Under Project Overview (gear icon) &gt; Project settings &gt; General &gt; "Add app" (Web &lt;/&gt;) &gt; copy the Firebase configuration JSON and paste into the API Credentials tab here!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
