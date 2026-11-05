/**
 * SyncNotes Data Models & Types
 */

export type NoteType = 'text' | 'audio' | 'photo';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Note {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  type: NoteType;
  content: string; // Text note body, or caption for photo/audio
  transcript?: string; // Web Speech API transcription for audio notes
  audioUrl?: string; // Audio file URL (Firebase Storage or local blob/data URL)
  photoUrl?: string; // Photo file URL (Firebase Storage or local base64/data URL)
  isPrivate: boolean; // If true: hidden from teammates, AI context, and Main tab
  createdAt: number; // Unix timestamp in ms
  updatedAt?: number;
}

export interface GroupMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'member';
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  members: GroupMember[];
  memberUids: string[];
}

export interface ActionItem {
  task: string;
  owner: string;
  status: 'pending' | 'completed';
}

export interface AISynthesis {
  groupId: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  whatChanged: string;
  keyTopics?: string[];
  generatedAt: number;
  notesCountAtGeneration: number;
}

export interface Citation {
  author: string;
  quoteOrContext: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: number;
}
