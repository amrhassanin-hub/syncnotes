import React, { useState, useEffect } from 'react';
import type { Group, Note, AISynthesis, AIChatMessage } from '../types';
import { requestAISynthesis, askAIQuestion } from '../services/aiService';
import { saveGroupSynthesis, getGroupSynthesis } from '../firebase/groupService';
import {
  Sparkles,
  RefreshCw,
  CheckSquare,
  Square,
  User,
  Clock,
  History,
  MessageSquare,
  Send,
  Quote,
  ShieldAlert,
  ChevronRight,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

interface Props {
  group: Group;
  notes: Note[];
}

export const MainAITab: React.FC<Props> = ({ group, notes }) => {
  // Only public notes are fed into the AI
  const publicNotes = notes.filter((n) => !n.isPrivate);

  const [synthesis, setSynthesis] = useState<AISynthesis | null>(null);
  const [isLoadingSynthesis, setIsLoadingSynthesis] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Chat with AI state
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I have analyzed all shared notes for "${group.name}". Ask me anything about your team's decisions, action items, or discussion points. I will cite the specific teammate's note for each fact.`,
      timestamp: Date.now(),
    },
  ]);
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Load cached synthesis on mount or group change
  useEffect(() => {
    let isMounted = true;

    async function loadCached() {
      const cached = await getGroupSynthesis(group.id);
      if (isMounted && cached) {
        setSynthesis(cached);
      } else if (isMounted && !cached && publicNotes.length > 0) {
        // Automatically generate initial synthesis if none cached yet
        handleGenerateSynthesis();
      }
    }

    loadCached();

    return () => {
      isMounted = false;
    };
  }, [group.id]);

  // Generate / Regenerate synthesis handler
  const handleGenerateSynthesis = async () => {
    if (isLoadingSynthesis) return;
    setIsLoadingSynthesis(true);
    setSynthesisError(null);

    try {
      const result = await requestAISynthesis(group.name, publicNotes, synthesis);
      result.groupId = group.id;
      setSynthesis(result);
      await saveGroupSynthesis(result);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setSynthesisError(err?.message || 'Failed to generate synthesis. Check your Gemini API connection.');
    } finally {
      setIsLoadingSynthesis(false);
    }
  };

  // Toggle action item completion in local UI
  const handleToggleActionItem = (index: number) => {
    if (!synthesis) return;
    const updated = { ...synthesis };
    const current = updated.actionItems[index];
    if (current) {
      current.status = current.status === 'completed' ? 'pending' : 'completed';
      setSynthesis(updated);
      saveGroupSynthesis(updated);
    }
  };

  // Ask AI handler
  const handleAskQuestion = async (e?: React.FormEvent, directQuestion?: string) => {
    if (e) e.preventDefault();
    const query = directQuestion || questionInput;
    if (!query.trim() || isAsking) return;

    const userMsg: AIChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsAsking(true);
    setChatError(null);

    try {
      const res = await askAIQuestion(group.name, query.trim(), publicNotes);

      const aiMsg: AIChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setChatError(err?.message || 'Failed to get answer from AI.');
    } finally {
      setIsAsking(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sampleQuestions = [
    'What were the key decisions made?',
    'Who is assigned to each action item?',
    'What did Marcus say in his voice memo?',
    'What are our deadlines and targets?',
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. AI SYNTHESIS CARD */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Team Synthesis
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Automatically synthesized from {publicNotes.length} shared notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {synthesis?.generatedAt && (
              <span className="text-[11px] text-indigo-200 hidden md:inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated {formatTimestamp(synthesis.generatedAt)}
              </span>
            )}
            <button
              onClick={handleGenerateSynthesis}
              disabled={isLoadingSynthesis || publicNotes.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 disabled:opacity-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSynthesis ? 'animate-spin' : ''}`} />
              <span>{isLoadingSynthesis ? 'Synthesizing...' : 'Regenerate'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {synthesisError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {synthesisError.includes('503') || synthesisError.includes('demand') || synthesisError.includes('UNAVAILABLE')
                      ? 'AI Service Temporarily Busy'
                      : 'Synthesis Notice'}
                  </span>
                  <p className="text-[11px] text-amber-900/90 mt-0.5">
                    {synthesisError.includes('503') || synthesisError.includes('demand') || synthesisError.includes('UNAVAILABLE')
                      ? 'Google Gemini experienced a momentary demand spike. Spikes clear in a few seconds.'
                      : synthesisError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateSynthesis}
                disabled={isLoadingSynthesis}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSynthesis ? 'animate-spin' : ''}`} />
                <span>Retry Now</span>
              </button>
            </div>
          )}

          {isLoadingSynthesis && !synthesis ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-semibold text-slate-700">
                Gemini is synthesizing shared notes...
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Extracting high-level takeaways, decisions, and action items with owners.
              </p>
            </div>
          ) : publicNotes.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Lightbulb className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No Shared Notes Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Head over to the <strong>Me</strong> tab to add your first note, voice memo, or photo.
                Notes marked as private will stay private to you!
              </p>
            </div>
          ) : (
            <>
              {/* Executive Summary */}
              {synthesis?.summary && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Executive Summary
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {synthesis.summary}
                  </div>
                </div>
              )}

              {/* What Changed Since Last Visit */}
              {synthesis?.whatChanged && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200 text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <History className="w-4 h-4 text-amber-600" />
                    <span>What Changed Since Last Visit</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900/90 whitespace-pre-wrap">
                    {synthesis.whatChanged}
                  </p>
                </div>
              )}

              {/* Two Column Grid: Decisions Made & Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Decisions Made */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>Decisions Made ({synthesis?.decisions?.length || 0})</span>
                  </div>

                  {synthesis?.decisions && synthesis.decisions.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {synthesis.decisions.map((dec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">•</span>
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No explicit decisions recorded yet.</p>
                  )}
                </div>

                {/* Action Items with Owners */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Action Items with Owners ({synthesis?.actionItems?.length || 0})</span>
                  </div>

                  {synthesis?.actionItems && synthesis.actionItems.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {synthesis.actionItems.map((item, i) => (
                        <li
                          key={i}
                          onClick={() => handleToggleActionItem(i)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white cursor-pointer transition border border-transparent hover:border-slate-200"
                        >
                          {item.status === 'completed' ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span
                              className={`${
                                item.status === 'completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 font-medium'
                              }`}
                            >
                              {item.task}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-indigo-600 mt-0.5">
                              <User className="w-3 h-3" />
                              <span className="font-semibold">{item.owner}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No action items detected.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ASK-THE-AI CHAT CARD WITH CITATIONS */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Ask the AI About All Notes
              </h3>
              <p className="text-xs text-slate-400">
                Grounded strictly in notes with member citations (e.g., "— Sara's note")
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Suggested Quick Question Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider mr-1">
              Suggestions:
            </span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(undefined, q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-medium border border-slate-200/60 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-3.5 text-xs sm:text-sm max-w-[85%] sm:max-w-[75%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations Box for AI Messages */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Quote className="w-3 h-3 text-indigo-500" /> Source Citations:
                      </div>
                      <div className="flex flex-col gap-1">
                        {msg.citations.map((c, i) => (
                          <div
                            key={i}
                            className="bg-white/80 p-1.5 rounded-lg border border-slate-200/60 text-[11px] text-slate-600"
                          >
                            <span className="font-bold text-indigo-600">
                              — {c.author}'s note:
                            </span>{' '}
                            <span className="italic text-slate-500">"{c.quoteOrContext}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80 text-slate-600 text-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Checking shared notes and preparing citations...</span>
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {chatError}
            </div>
          )}

          {/* Ask Input Box */}
          <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Ask a question about the group's notes..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              disabled={isAsking}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <button
              type="submit"
              disabled={isAsking || !questionInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
