/**
 * Client AI Service
 * 
 * Communicates with the secure backend / Firebase Cloud Function proxy
 * so that the GEMINI_API_KEY is never exposed in the browser.
 */

import type { Note, AISynthesis, AIChatMessage } from '../types';

const BASE_URL = import.meta.env.VITE_CUSTOM_AI_ENDPOINT || '';

export async function requestAISynthesis(
  groupName: string,
  notes: Note[],
  previousSynthesis?: AISynthesis | null
): Promise<AISynthesis> {
  const publicNotes = notes.filter((n) => !n.isPrivate);

  const endpoint = `${BASE_URL}/api/synthesize`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      groupName,
      notes: publicNotes,
      previousSynthesis,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Synthesis failed (${response.status})`);
  }

  const data = await response.json();
  return {
    groupId: data.groupId || '',
    summary: data.summary,
    decisions: data.decisions || [],
    actionItems: data.actionItems || [],
    whatChanged: data.whatChanged || '',
    keyTopics: data.keyTopics || [],
    generatedAt: data.generatedAt || Date.now(),
    notesCountAtGeneration: data.notesCountAtGeneration || publicNotes.length,
  };
}

export async function askAIQuestion(
  groupName: string,
  question: string,
  notes: Note[]
): Promise<{ answer: string; citations: { author: string; quoteOrContext: string }[]; confidence?: string }> {
  const publicNotes = notes.filter((n) => !n.isPrivate);

  const endpoint = `${BASE_URL}/api/ask-ai`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      groupName,
      question,
      notes: publicNotes,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Question answering failed (${response.status})`);
  }

  return await response.json();
}
