const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

function truncateText(s, max = 8000) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Generate multiple-choice quiz JSON from context text + notes.
 * Returns { questions: [{ stem, choices:[], answerIndex }] }
 */
async function generateQuizFromContext({ pdfText, notes, title, numQuestions = 5 }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a quiz generator. Create a JSON object with exactly ${numQuestions} multiple-choice questions
based only on the provided course context. Each question must have 4 choices and one correct answer.

Return strictly JSON in this schema (no extra text):
{
  "questions": [
    { "stem": "...", "choices": ["...","...","...","..."], "answerIndex": 0 }
  ]
}

Course Title: ${title || ''}

Teacher Notes (optional):
${notes || ''}

Course Context (truncated):
${truncateText(pdfText)}
  `.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  const jsonStr = jsonStart >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text;
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // retry safe fallback: simple one question
    parsed = {
      questions: [
        { stem: 'Fallback: Which option is correct?', choices: ['A','B','C','D'], answerIndex: 0 }
      ]
    };
  }
  // basic validation
  const qs = Array.isArray(parsed.questions) ? parsed.questions.slice(0, numQuestions) : [];
  return { questions: qs.map(q => ({
    stem: q.stem || 'Question?',
    choices: Array.isArray(q.choices) && q.choices.length === 4 ? q.choices : ['A','B','C','D'],
    answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0
  })) };
}

module.exports = { generateQuizFromContext };