'use strict';
/**
 * ✅ Gemini Quiz Generator (using @google/genai v1)
 * Works with Gemini 2.x (gemini-2.0-flash / gemini-2.5-flash).
 */


const { GoogleGenAI } = require('@google/genai');

/** 从 SDK 响应里尽可能拿到纯文本 */
function extractText(result) {
  try {
    if (!result) return '';
    if (typeof result.output_text === 'string' && result.output_text.trim()) {
      return result.output_text;
    }
    // 新 SDK 可能返回 candidates 数组
    const cand = Array.isArray(result.candidates) ? result.candidates[0] : undefined;
    const parts = cand?.content?.parts;
    if (Array.isArray(parts)) {
      const withText = parts.find(p => typeof p.text === 'string' && p.text.trim());
      if (withText) return withText.text;
    }
    // 旧风格兼容
    if (typeof result.text === 'function') {
      const t = result.text();
      if (typeof t === 'string') return t;
    }
  } catch (_) {}
  return '';
}

/** 确保 API key 存在 */
function assertEnv() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env');
  return key;
}

/** 截断过长文本 */
function truncateText(s, max = 8000) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

/** prompt 生成函数 */
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

/** 安全 JSON 解析 */
function safeParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** 主函数 */
async function generateQuizFromContext({ pdfText, notes, title, numQuestions = 5, difficulty = 'medium' }) {
  const ai = new GoogleGenAI({ apiKey: assertEnv() });

  const prompt = buildPrompt({ pdfText, notes, title, numQuestions, difficulty });

  // ✅ 仅使用新版模型
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let raw = '', lastError;

  for (const model of models) {
    try {
      console.log(`[genai] trying model ${model}`);
      const result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      // 处理可能的安全拦截
      if (result?.prompt_feedback?.block_reason) {
        const br = result.prompt_feedback.block_reason;
        throw new Error(`prompt blocked: ${br}`);
      }

      raw = extractText(result);
      if (raw && typeof raw === 'string' && raw.trim()) {
        console.log(`[genai] ✅ success with ${model}`);
        break;
      } else {
        // 没有抛错但也没有返回文本，打印一份精简诊断
        console.warn(`[genai] empty output from ${model}, sample=`, JSON.stringify({
          hasOutputText: !!result?.output_text,
          candidatesLen: Array.isArray(result?.candidates) ? result.candidates.length : 0,
          promptFeedback: result?.prompt_feedback || null,
        }));
        // 继续 fallback 到下一个模型
      }
    } catch (err) {
      console.warn(`[genai] fallback from ${model}:`, err.message);
      lastError = err;
      continue;
    }
  }

  // 如果上面没有捕捉到具体错误，但也没有拿到文本，给出更多上下文
  if (!raw && lastError && lastError.response) {
    try {
      console.warn('[genai] last error response:', JSON.stringify(lastError.response, null, 2));
    } catch (_) {}
  }
  if (!raw) {
    throw new Error('All Gemini models failed: ' + (lastError?.message || 'unknown error'));
  }

  // 清理 Markdown 包裹
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = safeParseJSON(cleaned) || safeParseJSON(raw);
  if (!parsed?.questions?.length) {
    console.error('[genai] bad output sample:', raw.slice(0, 200));
    throw new Error('Quiz generation failed: invalid model response');
  }

  // 标准化输出
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