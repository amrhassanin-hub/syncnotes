import React, { useState } from 'react';
import type { Note, UserProfile } from '../types';
import {
  FileText,
  Mic,
  Image as ImageIcon,
  Lock,
  Globe,
  Trash2,
  Edit3,
  Check,
  X,
  Volume2,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';

interface Props {
  note: Note;
  currentUser: UserProfile;
  onDelete?: (noteId: string) => void;
  onTogglePrivate?: (noteId: string, isPrivate: boolean) => void;
  onEditContent?: (noteId: string, newContent: string) => void;
}

export const NoteCard: React.FC<Props> = ({
  note,
  currentUser,
  onDelete,
  onTogglePrivate,
  onEditContent,
}) => {
  const isAuthor = currentUser.uid === note.authorId;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Format relative timestamp
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSaveEdit = () => {
    onEditContent?.(note.id, editContent);
    setIsEditing(false);
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 p-4 sm:p-5 relative group overflow-hidden">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Author info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {note.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-800">
                {note.authorName}
              </span>
              {isAuthor && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-semibold">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{formatTime(note.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Badges: Type & Privacy */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Note Type Badge */}
          {note.type === 'text' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <FileText className="w-3 h-3" /> Text
            </span>
          )}
          {note.type === 'audio' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Mic className="w-3 h-3" /> Audio
            </span>
          )}
          {note.type === 'photo' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ImageIcon className="w-3 h-3" /> Photo
            </span>
          )}

          {/* Privacy Badge */}
          {note.isPrivate ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
              title="Private: Not shared with teammates or AI"
            >
              <Lock className="w-3 h-3 text-rose-500" /> Private
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200"
              title="Shared with teammates and AI synthesis"
            >
              <Globe className="w-3 h-3 text-slate-400" /> Shared
            </span>
          )}
        </div>
      </div>

      {/* Note Content / Body */}
      {isEditing ? (
        <div className="space-y-2 mt-2">
          <textarea
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {note.content && (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
          )}

          {/* Photo Note Display */}
          {note.type === 'photo' && note.photoUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-72">
              <img
                src={note.photoUrl}
                alt={note.content || 'Note photo'}
                className="w-full h-auto object-cover max-h-72 hover:scale-[1.01] transition duration-300"
                loading="lazy"
              />
            </div>
          )}

          {/* Audio Note Display & Transcript */}
          {note.type === 'audio' && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2.5">
              {note.audioUrl && (
                <div className="w-full">
                  <audio
                    src={note.audioUrl}
                    controls
                    className="w-full h-9 rounded-lg"
                  />
                </div>
              )}

              {/* Speech-to-Text Transcript */}
              {note.transcript && (
                <div className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200/40">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      Live Speech Transcript
                    </span>
                    {note.transcript.length > 120 && (
                      <button
                        onClick={() => setShowFullTranscript(!showFullTranscript)}
                        className="text-amber-700 hover:underline"
                      >
                        {showFullTranscript ? 'Show less' : 'Show full'}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 italic leading-relaxed">
                    "{showFullTranscript || note.transcript.length <= 120
                      ? note.transcript
                      : note.transcript.slice(0, 120) + '...'}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions (Author only) */}
      {isAuthor && !isEditing && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {/* Quick toggle privacy */}
          <button
            onClick={() => onTogglePrivate?.(note.id, !note.isPrivate)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition ${
              note.isPrivate
                ? 'text-rose-600 hover:bg-rose-50'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={note.isPrivate ? 'Make shared' : 'Make private'}
          >
            {note.isPrivate ? (
              <>
                <Lock className="w-3 h-3" />
                <span className="text-[11px] font-medium">Make Shared</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-medium">Make Private</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditContent(note.content);
                setIsEditing(true);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Edit note"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this note?')) {
                  onDelete?.(note.id);
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Delete note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
