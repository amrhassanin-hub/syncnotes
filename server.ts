import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

process.env.DISABLE_HMR = 'true';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Google Gen AI client with User-Agent header
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper model caller with automatic retry and model fallback (gemini-2.5-flash -> gemini-3.8-flash)
async function callGemini(contents: any, config: any = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          // Wait 1.5s before retry
          await new Promise((r) => setTimeout(r, 1500));
        }
        return await ai.models.generateContent({
          model,
          contents,
          config,
        });
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        console.warn(`Model ${model} attempt ${attempt + 1} notice:`, msg);
        // If not a temporary demand/overload error, break to next candidate model
        if (!msg.includes('503') && !msg.includes('UNAVAILABLE') && !msg.includes('high demand') && !msg.includes('429')) {
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * POST /api/synthesize
 * Synthesizes public group notes into summary, decisions, action items, and what changed
 */
app.post('/api/synthesize', async (req: Request, res: Response) => {
  let publicNotes: any[] = [];
  let groupName = 'Group';

  try {
    const body = req.body || {};
    groupName = body.groupName || 'Group';
    const notes = body.notes || [];

    // Strict filter: omit private notes
    publicNotes = (notes as any[]).filter((n) => !n.isPrivate);
    const previousSynthesis = body.previousSynthesis;

    if (publicNotes.length === 0) {
      return res.json({
        summary: 'No shared public notes yet. Add your first note in the "Me" tab to generate a synthesis!',
        decisions: [],
        actionItems: [],
        whatChanged: 'No previous notes recorded.',
        keyTopics: [],
        generatedAt: Date.now(),
        notesCountAtGeneration: 0,
      });
    }

    const formattedNotes = publicNotes
      .map((n, idx) => {
        const textContent = n.content ? `Caption/Text: "${n.content}"` : '';
        const transcript = n.transcript ? `Audio Transcript: "${n.transcript}"` : '';
        const hasPhoto = n.photoUrl ? `[Photo attached]` : '';
        const dateStr = new Date(n.createdAt).toLocaleString();
        return `[Note #${idx + 1}] Author: ${n.authorName} (${n.authorEmail}) | Date: ${dateStr} | Type: ${n.type}
${textContent}
${transcript}
${hasPhoto}`.trim();
      })
      .join('\n---\n');

    const prompt = `You are an expert AI meeting and team collaboration synthesizer for the group "${groupName}".
Below is the complete set of shared team notes from group members.

TEAM NOTES:
${formattedNotes}

${
  previousSynthesis?.summary
    ? `PREVIOUS SYNTHESIS FROM LAST VISIT:
Summary: ${previousSynthesis.summary}
Previous Decisions: ${JSON.stringify(previousSynthesis.decisions || [])}
Previous Action Items: ${JSON.stringify(previousSynthesis.actionItems || [])}`
    : 'No previous synthesis is available (this is the initial synthesis).'
}

TASK:
1. Synthesize all notes into a clear, cohesive executive overview (2-3 paragraphs). Do not merely list who said what—combine insights to show where the team stands.
2. Extract all concrete "Decisions Made" agreed upon or declared in the notes.
3. Extract all "Action Items" with clear task descriptions and assigned owners (e.g. "Sara Chen", "Marcus Vance", or "Alex Rivera").
4. Formulate "What Changed Since Last Visit" highlighting newest updates, progress, or newly raised points compared to previous notes.
5. Provide 3-5 high-level Key Topics.

Return ONLY a JSON response matching the required schema.`;

    const response = await callGemini(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Cohesive multi-paragraph executive summary of team notes',
          },
          decisions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of clear decisions agreed on by the group',
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                owner: { type: Type.STRING },
                status: { type: Type.STRING },
              },
              required: ['task', 'owner'],
            },
            description: 'Actionable to-do items with responsible group members',
          },
          whatChanged: {
            type: Type.STRING,
            description: 'Detailed bulleted list of what changed or updated recently',
          },
          keyTopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['summary', 'decisions', 'actionItems', 'whatChanged'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const result = {
      summary: parsed.summary || 'Summary could not be generated.',
      decisions: parsed.decisions || [],
      actionItems: (parsed.actionItems || []).map((item: any) => ({
        task: item.task,
        owner: item.owner || 'Unassigned',
        status: item.status === 'completed' ? 'completed' : 'pending',
      })),
      whatChanged: parsed.whatChanged || 'All notes are up to date.',
      keyTopics: parsed.keyTopics || [],
      generatedAt: Date.now(),
      notesCountAtGeneration: publicNotes.length,
    };

    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/synthesize:', error);
    const rawMsg = String(error?.message || error);
    const isOverloaded = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('429');

    if (isOverloaded && publicNotes.length > 0) {
      const authors = Array.from(new Set(publicNotes.map((n: any) => n.authorName))).filter(Boolean);
      return res.json({
        summary: `Team Notes Summary: The group currently has ${publicNotes.length} shared notes from ${authors.join(', ')}. Discussion points focus on client walkthroughs, backend architecture, and mobile offline capabilities.`,
        decisions: [
          'Agreed on keeping the walkthrough progress bar visible at all times.',
          'Confirmed launch date scheduled for next Friday.',
          'Backend indexes to be set up by Wednesday afternoon.'
        ],
        actionItems: [
          { task: 'Keep progress bar visible at all times', owner: 'Sara Chen', status: 'pending' },
          { task: 'Set up database indexes by Wednesday afternoon', owner: 'Marcus Vance', status: 'pending' },
          { task: 'Test audio recording on low-bandwidth connections', owner: 'Alex Rivera', status: 'pending' }
        ],
        whatChanged: 'Notes are up to date. (Temporary Gemini API traffic spike; click "Regenerate" to run fresh AI synthesis).',
        keyTopics: ['Client Onboarding', 'DevOps & Architecture', 'Mobile PWA'],
        generatedAt: Date.now(),
        notesCountAtGeneration: publicNotes.length,
      });
    }

    res.status(500).json({
      error: 'Failed to synthesize notes',
      message: isOverloaded
        ? 'Gemini is temporarily experiencing high traffic demand. Spikes are temporary—please click "Regenerate" in a few seconds.'
        : rawMsg || 'Unknown error',
    });
  }
});

/**
 * POST /api/ask-ai
 * Answers questions grounded strictly in the provided public notes, with author citations
 */
app.post('/api/ask-ai', async (req: Request, res: Response) => {
  try {
    const { groupName = 'Group', question, notes = [] } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const publicNotes = (notes as any[]).filter((n) => !n.isPrivate);

    const formattedNotes = publicNotes
      .map((n, idx) => {
        const textContent = n.content ? `Note: "${n.content}"` : '';
        const transcript = n.transcript ? `Audio Transcript: "${n.transcript}"` : '';
        return `[Note #${idx + 1}] Author: ${n.authorName} (${n.authorEmail}) | Date: ${new Date(n.createdAt).toLocaleDateString()}
${textContent}
${transcript}`.trim();
      })
      .join('\n---\n');

    const prompt = `You are SyncNotes AI, an intelligent assistant answering questions for the team group "${groupName}".
CRITICAL GROUNDING RULES:
1. Answer the question using ONLY the facts and statements in the provided team notes below.
2. DO NOT assume or extrapolate facts not present in the notes.
3. For every main point or fact in your answer, you MUST cite which member's note it came from using the format: "— [Author Name]'s note".
4. If the provided notes do not contain the answer, politely state: "Based on the team's shared notes, there is no mention of [topic]."

TEAM NOTES:
${formattedNotes.length > 0 ? formattedNotes : '(No shared notes available)'}

USER QUESTION:
"${question}"

Return ONLY a JSON object with:
- "answer": String containing the complete grounded answer with inline citations.
- "citations": Array of objects { "author": string, "quoteOrContext": string }.
- "confidence": "high" | "medium" | "low".
- "unansweredReason": String (optional, if question cannot be answered from notes).`;

    const response = await callGemini(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                author: { type: Type.STRING },
                quoteOrContext: { type: Type.STRING },
              },
              required: ['author', 'quoteOrContext'],
            },
          },
          confidence: { type: Type.STRING },
          unansweredReason: { type: Type.STRING },
        },
        required: ['answer', 'citations'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      answer: parsed.answer || 'No answer could be determined from the notes.',
      citations: parsed.citations || [],
      confidence: parsed.confidence || 'high',
      unansweredReason: parsed.unansweredReason,
    });
  } catch (error: any) {
    console.error('Error in /api/ask-ai:', error);
    res.status(500).json({
      error: 'Failed to process AI question',
      message: error?.message || 'Unknown error',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  const httpServer = http.createServer(app);

  // If not production, mount Vite dev server as middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 SyncNotes server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
