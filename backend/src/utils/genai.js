'use strict';
/**
 * Generates multiple-choice quiz questions using Google Gemini (via @google/genai).
 *
 * Uses Gemini models ('gemini-2.5-flash' → fallback 'gemini-2.0-flash').
 * Reads the API key from environment variable GOOGLE_GENERATIVE_AI_API_KEY.
 * generateQuizFromContext({ pdfText, notes, title, numQuestions, difficulty })
 *   -- Builds a JSON-only prompt and generates quiz questions with 4 choices each.
 *   -- Parses and validates the model’s response into a structured format:
 *        { questions: [{ stem, choices, answerIndex }] }.
 * Helper functions:
 *   – extractText(result): Safely retrieves text output from varied Gemini responses.
 *   – buildPrompt(opts): Constructs the AI prompt with course context and notes.
 *   – truncateText(text, max): Trims long text before sending to the model.
 *   – safeParseJSON(text): Robust JSON parser with fallback.
 */

const { GoogleGenAI } = require('@google/genai');

/** Extract text content from model result */
function extractText(result) {
  try {
    if (!result) return '';
    if (typeof result.output_text === 'string' && result.output_text.trim()) {
      return result.output_text;
    }
    // new style of response
    const cand = Array.isArray(result.candidates) ? result.candidates[0] : undefined;
    const parts = cand?.content?.parts;
    if (Array.isArray(parts)) {
      const withText = parts.find(p => typeof p.text === 'string' && p.text.trim());
      if (withText) return withText.text;
    }
    // fallback to text() method
    if (typeof result.text === 'function') {
      const t = result.text();
      if (typeof t === 'string') return t;
    }
  } catch (_) {}
  return '';
}

/** make sure API key exists */
function assertEnv() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env');
  return key;
}

/** truncate long text */
function truncateText(s, max = 8000) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

/** prompt builder */
function buildPrompt({ pdfText = '', notes = '', title = '', numQuestions = 5, difficulty = 'medium' }) {
  return `
You are a quiz generator AI. Create exactly ${numQuestions} multiple-choice questions at ${difficulty} difficulty.
Each question has 4 choices and exactly one correct answer.

Return strictly JSON only:
{
  "questions": [
    { "stem": "Question text", "choices": ["A","B","C","D"], "answerIndex": 0 }
  ]
}

Course Title: ${title || 'Weekly Quiz'}
Teacher Notes: ${notes || '(none)'}
Course Context (truncated if long):
${truncateText(pdfText)}
  `.trim();
}

/** safe JSON parse */
function safeParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** main function to generate quiz */
async function generateQuizFromContext({ pdfText, notes, title, numQuestions = 5, difficulty = 'medium' }) {
  const ai = new GoogleGenAI({ apiKey: assertEnv() });

  const prompt = buildPrompt({ pdfText, notes, title, numQuestions, difficulty });

  // try multiple models in order
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let raw = '', lastError;

  for (const model of models) {
    try {
      console.log(`[genai] trying model ${model}`);
      const result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      // handle content block
      if (result?.prompt_feedback?.block_reason) {
        const br = result.prompt_feedback.block_reason;
        throw new Error(`prompt blocked: ${br}`);
      }

      raw = extractText(result);
      if (raw && typeof raw === 'string' && raw.trim()) {
        console.log(`[genai] ✅ success with ${model}`);
        break;
      } else {
        // if no text, log details
        console.warn(`[genai] empty output from ${model}, sample=`, JSON.stringify({
          hasOutputText: !!result?.output_text,
          candidatesLen: Array.isArray(result?.candidates) ? result.candidates.length : 0,
          promptFeedback: result?.prompt_feedback || null,
        }));
        // continue to next model
      }
    } catch (err) {
      console.warn(`[genai] fallback from ${model}:`, err.message);
      lastError = err;
      continue;
    }
  }

  // if all models failed
  if (!raw && lastError && lastError.response) {
    try {
      console.warn('[genai] last error response:', JSON.stringify(lastError.response, null, 2));
    } catch (_) {}
  }
  if (!raw) {
    throw new Error('All Gemini models failed: ' + (lastError?.message || 'unknown error'));
  }

  // clean and parse output
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = safeParseJSON(cleaned) || safeParseJSON(raw);
  if (!parsed?.questions?.length) {
    console.error('[genai] bad output sample:', raw.slice(0, 200));
    throw new Error('Quiz generation failed: invalid model response');
  }

  // structure output
  const arr = parsed.questions.slice(0, numQuestions).map((q, i) => {
    const stem = q.stem || q.text || q.question || `Question ${i + 1}?`;
    const choices = Array.isArray(q.choices ?? q.options)
      ? q.choices.slice(0, 4)
      : ['A', 'B', 'C', 'D'];
    while (choices.length < 4) choices.push(`Option ${choices.length + 1}`);
    const answerIndex = Number.isInteger(q.answerIndex)
      ? q.answerIndex
      : (Number.isInteger(q.correctIndex) ? q.correctIndex : 0);
    return { stem, choices, answerIndex: Math.max(0, Math.min(3, answerIndex)) };
  });

  return { questions: arr };
}

module.exports = { generateQuizFromContext };