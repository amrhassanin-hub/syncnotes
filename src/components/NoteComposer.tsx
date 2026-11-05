import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteType, UserProfile } from '../types';
import { addNote, uploadMediaFile } from '../firebase/notesService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  FileText,
  Mic,
  Camera,
  Upload,
  Lock,
  Globe,
  Send,
  Square,
  Sparkles,
  X,
  Volume2,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';

interface Props {
  groupId: string;
  currentUser: UserProfile;
  onNoteAdded: (note: Note) => void;
}

const DRAFT_KEY_PREFIX = 'syncnotes_draft_';

export const NoteComposer: React.FC<Props> = ({ groupId, currentUser, onNoteAdded }) => {
  const [activeType, setActiveType] = useState<NoteType>('text');
  const [textContent, setTextContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedAlert, setDraftSavedAlert] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Audio recording hook with Web Speech API
  const {
    isRecording,
    recordingDuration,
    transcript,
    setTranscript,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  // Load offline draft from localStorage on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${groupId}`);
      if (draft) {
        setTextContent(draft);
      }
    } catch (e) {
      console.error(e);
    }
  }, [groupId]);

  // Auto-save text draft to localStorage as user types
  const handleTextChange = (val: string) => {
    setTextContent(val);
    try {
      if (val.trim()) {
        localStorage.setItem(`${DRAFT_KEY_PREFIX}${groupId}`, val);
      } else {
        localStorage.removeItem(`${DRAFT_KEY_PREFIX}${groupId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Photo file picker handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  // Submit note handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (activeType === 'text' && !textContent.trim()) {
      return;
    }
    if (activeType === 'audio' && !audioBlob && !transcript.trim() && !textContent.trim()) {
      return;
    }
    if (activeType === 'photo' && !photoFile && !photoPreview) {
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAudioUrl: string | undefined = undefined;
      let finalPhotoUrl: string | undefined = undefined;

      // Upload audio if present
      if (audioBlob) {
        const path = `groups/${groupId}/audio/${Date.now()}_${currentUser.uid}.webm`;
        finalAudioUrl = await uploadMediaFile(audioBlob, path);
      }

      // Upload photo if present
      if (photoFile) {
        const path = `groups/${groupId}/photos/${Date.now()}_${photoFile.name}`;
        finalPhotoUrl = await uploadMediaFile(photoFile, path);
      }

      const note = await addNote({
        groupId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorEmail: currentUser.email,
        type: activeType,
        content: textContent.trim(),
        transcript: activeType === 'audio' ? transcript.trim() : undefined,
        audioUrl: finalAudioUrl,
        photoUrl: finalPhotoUrl,
        isPrivate,
      });

      // Clear draft & state
      setTextContent('');
      localStorage.removeItem(`${DRAFT_KEY_PREFIX}${groupId}`);
      resetRecording();
      clearPhoto();
      setIsPrivate(false);

      onNoteAdded(note);
    } catch (err: any) {
      console.error('Failed to post note:', err);
      alert('Could not post note: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format recording timer: 00:05
  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-6">
      {/* Top Type Selector Tabs */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveType('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'text'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'audio'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-amber-600" />
            <span>Audio Memo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('photo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeType === 'photo'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Photo</span>
          </button>
        </div>

        {/* 🔒 Private Note Toggle */}
        <button
          type="button"
          onClick={() => setIsPrivate(!isPrivate)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
            isPrivate
              ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title="Private notes are hidden from teammates, AI synthesis, and Ask-the-AI"
        >
          {isPrivate ? (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Private to Me</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Shared with Team</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* TEXT NOTE COMPONENT */}
        {activeType === 'text' && (
          <div>
            <textarea
              rows={3}
              placeholder="Jot down notes, meeting decisions, ideas, or to-dos... (Auto-saves draft offline)"
              value={textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 resize-none font-sans"
            />
          </div>
        )}

        {/* AUDIO NOTE COMPONENT */}
        {activeType === 'audio' && (
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-bold text-amber-950">
                  {isRecording ? `Recording... ${formatSecs(recordingDuration)}` : audioUrl ? 'Voice Recording Ready' : 'Ready to Record Voice Memo'}
                </span>
              </div>

              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-xs"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {audioUrl ? 'Record Again' : 'Start Mic'}
                </button>
              )}
            </div>

            {/* Playback preview if recorded */}
            {audioUrl && (
              <div className="pt-1">
                <audio src={audioUrl} controls className="w-full h-9 rounded-lg" />
              </div>
            )}

            {/* Live Web Speech API Transcript Preview */}
            <div className="bg-white p-3 rounded-xl border border-amber-200/50 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  Auto-Transcription (Web Speech API):
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Editable below
                </span>
              </div>
              <textarea
                rows={2}
                placeholder={isRecording ? 'Listening and transcribing live as you speak...' : 'Transcript will appear here. You can also edit it directly.'}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full text-xs text-slate-700 border-0 focus:outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none font-sans"
              />
            </div>

            {/* Optional note caption */}
            <input
              type="text"
              placeholder="Optional title or note summary..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-amber-200/60 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {/* PHOTO NOTE COMPONENT */}
        {activeType === 'photo' && (
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/70 space-y-3">
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-slate-900 max-h-60 flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Upload preview"
                  className="max-h-60 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Mobile Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-4 border-2 border-dashed border-emerald-300 rounded-xl bg-white hover:bg-emerald-50/80 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 transition"
                >
                  <Camera className="w-6 h-6 text-emerald-600" />
                  <span>Take Photo with Camera</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ideal for phone notes &amp; whiteboards</span>
                </button>

                {/* Upload from Gallery / Disk */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-4 border-2 border-dashed border-emerald-300 rounded-xl bg-white hover:bg-emerald-50/80 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 transition"
                >
                  <Upload className="w-6 h-6 text-emerald-600" />
                  <span>Choose from Gallery / Files</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, HEIC</span>
                </button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            )}

            {/* Photo Caption */}
            <input
              type="text"
              placeholder="Add a caption or explanation for this photo..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-200/60 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400">
            {isPrivate ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private (Excluded from Main AI synthesis)
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Included in AI synthesis &amp; shared with team
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
