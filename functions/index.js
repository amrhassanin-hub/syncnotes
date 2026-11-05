/**
 * SyncNotes - Firebase Cloud Functions
 * 
 * Proxies calls to Google Gemini API (model: gemini-2.5-flash) so your API key
 * is securely stored on the server and never exposed in the browser.
 * 
 * To deploy:
 * 1. Set your Gemini API key in Firebase Functions config or secret:
 *    firebase functions:secrets:set GEMINI_API_KEY
 * 2. Deploy:
 *    firebase deploy --only functions
 */

const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const { GoogleGenAI, Type } = require('@google/genai');

// Read API key from environment secret or functions config
const apiKey = process.env.GEMINI_API_KEY || (functions.config().gemini && functions.config().gemini.key);

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function runGemini(contents, config) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config,
    });
  } catch (err) {
    console.warn('Fallback to gemini-3.8-flash due to:', err.message);
    return await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config,
    });
  }
}

/**
 * Cloud Function: synthesize
 * Generates an executive summary, decisions made, action items with owners,
 * and what changed since last visit from all public shared group notes.
 */
exports.synthesize = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { groupName = 'Group', notes = [], previousSynthesis } = req.body;

      // Filter out private notes
      const publicNotes = (notes || []).filter((n) => !n.isPrivate);

      if (publicNotes.length === 0) {
        return res.json({
          summary: 'No shared public notes yet.',
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
TEAM NOTES:
${formattedNotes}

${
  previousSynthesis?.summary
    ? `PREVIOUS SYNTHESIS:
Summary: ${previousSynthesis.summary}
Previous Decisions: ${JSON.stringify(previousSynthesis.decisions || [])}`
    : 'No previous synthesis.'
}

TASK:
1. Synthesize all notes into an executive overview (2-3 paragraphs).
2. Extract all "Decisions Made".
3. Extract all "Action Items" with clear task descriptions and assigned owners.
4. Formulate "What Changed Since Last Visit".
5. Provide 3-5 Key Topics.`;

      const response = await runGemini(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
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
            },
            whatChanged: { type: Type.STRING },
            keyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['summary', 'decisions', 'actionItems', 'whatChanged'],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        ...parsed,
        generatedAt: Date.now(),
        notesCountAtGeneration: publicNotes.length,
      });
    } catch (err) {
      console.error('Synthesize Cloud Function error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  });
});

/**
 * Cloud Function: askAI
 * Answers questions about the group notes using ONLY the provided public notes,
 * citing which member's note each fact came from.
 */
exports.askAI = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { groupName = 'Group', question, notes = [] } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const publicNotes = (notes || []).filter((n) => !n.isPrivate);

      const formattedNotes = publicNotes
        .map((n, idx) => {
          const textContent = n.content ? `Note: "${n.content}"` : '';
          const transcript = n.transcript ? `Audio Transcript: "${n.transcript}"` : '';
          return `[Note #${idx + 1}] Author: ${n.authorName} (${n.authorEmail}) | Date: ${new Date(n.createdAt).toLocaleDateString()}
${textContent}
${transcript}`.trim();
        })
        .join('\n---\n');

      const prompt = `You are SyncNotes AI answering questions for "${groupName}".
CRITICAL GROUNDING RULES:
1. Answer using ONLY facts found in the provided team notes.
2. For each key fact or claim, cite which member's note it came from (e.g. "— Sara's note").
3. If the notes do not contain the answer, state that none of the members have noted that information.

TEAM NOTES:
${formattedNotes.length > 0 ? formattedNotes : '(No notes)'}

QUESTION:
"${question}"`;

      const response = await runGemini(prompt, {
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
      return res.json(parsed);
    } catch (err) {
      console.error('AskAI Cloud Function error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  });
});
