const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const router = express.Router();

const auth = require('../middleware/auth');
const QuizWeekConfig = require('../models/QuizWeekConfig');
const CourseSettings = require('../models/CourseSettings');
const DailyQuiz = require('../models/DailyQuiz');
const { generateQuizFromContext } = require('../utils/genai');

// teacher-only guard
function requireTeacher(req, res, next) {
  if (!req.user || req.user.isStudent) return res.status(403).json({ message: 'Teacher only' });
  next();
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function weekIndexForDate(startDateStr, dateStr) {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr + 'T00:00:00');
  const cur = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor((cur - start) / 86400000);
  const idx = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(idx, 1), 12);
}

function isMonToFri(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day >= 1 && day <= 5;
}

// 计算某周某天的具体日期字符串
function dateForWeekDay(startDateStr, weekIndex, dayIndex /* 0..4 => Mon..Fri */) {
  if (!startDateStr) return null;
  if (!Number.isInteger(weekIndex) || weekIndex < 1 || weekIndex > 12) return null;
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 4) return null;
  const base = new Date(startDateStr + 'T00:00:00'); // week 1 Monday
  base.setDate(base.getDate() + (weekIndex - 1) * 7 + dayIndex);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===== GET current config =====
router.get('/quiz-config', auth, requireTeacher, async (req, res) => {
  const [settings, weeks] = await Promise.all([
    CourseSettings.findOne({ key: 'course' }),
    QuizWeekConfig.find({}).sort({ weekIndex: 1 })
  ]);
  res.json({
    startDate: settings?.startDate || null,
    autoGenerate: settings?.autoGenerate ?? false,
    weeks
  });
});

// ===== List recent quizzes (teacher) =====
router.get('/quizzes', auth, requireTeacher, async (req, res) => {
  const { limit = 50, cursor } = req.query; // optional pagination
  const q = {};
  if (cursor) q.date = { $lt: cursor }; // paging by date string 'YYYY-MM-DD'
  const list = await DailyQuiz.find(q).sort({ date: -1 }).limit(Math.min(+limit || 50, 100));
  res.json(list);
});

// ===== Update a quiz (questions & answers) =====
router.patch('/quizzes/:id', auth, requireTeacher, async (req, res) => {
  const { questions } = req.body || {};
  if (!Array.isArray(questions)) {
    return res.status(400).json({ message: 'questions[] required' });
  }
  const updated = await DailyQuiz.findByIdAndUpdate(
    req.params.id,
    { $set: { questions, updatedAt: new Date() } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'quiz not found' });
  res.json(updated);
});

// ===== PATCH start date =====
router.patch('/quiz-config/start-date', auth, requireTeacher, async (req, res) => {
  const { startDate } = req.body || {};
  if (!/\d{4}-\d{2}-\d{2}/.test(startDate || '')) {
    return res.status(400).json({ message: 'Invalid startDate (YYYY-MM-DD)' });
  }
  const doc = await CourseSettings.findOneAndUpdate(
    { key: 'course' },
    { $set: { startDate } },
    { new: true, upsert: true }
  );
  res.json({ startDate: doc.startDate });
});

// ===== Toggle auto-generate (Mon–Fri based on startDate) =====
router.patch('/quiz-config/auto-generate', auth, requireTeacher, async (req, res) => {
  const { autoGenerate } = req.body || {};
  if (typeof autoGenerate !== 'boolean') {
    return res.status(400).json({ message: 'autoGenerate must be boolean' });
  }
  const doc = await CourseSettings.findOneAndUpdate(
    { key: 'course' },
    { $set: { autoGenerate } },
    { new: true, upsert: true }
  );
  res.json({ autoGenerate: !!doc.autoGenerate });
});

// ===== Upload/replace PDF for a week =====
router.post('/quiz-config/:weekIndex/pdf', auth, requireTeacher, upload.single('file'), async (req, res) => {
  const weekIndex = Number(req.params.weekIndex);
  if (!Number.isInteger(weekIndex) || weekIndex < 1 || weekIndex > 12) {
    return res.status(400).json({ message: 'Invalid weekIndex' });
  }
  if (!req.file || req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ message: 'Please upload a PDF' });
  }
  const data = await pdfParse(req.file.buffer);
  const pdfText = data.text || '';
  const cfg = await QuizWeekConfig.findOneAndUpdate(
    { weekIndex },
    { $set: { pdfName: req.file.originalname, pdfText, pdfUpdatedAt: new Date() } },
    { new: true, upsert: true }
  );
  res.json({ message: 'Uploaded', weekIndex: cfg.weekIndex, pdfName: cfg.pdfName });
});

// ===== Update week title/notes =====
router.patch('/quiz-config/:weekIndex/meta', auth, requireTeacher, async (req, res) => {
  const weekIndex = Number(req.params.weekIndex);
  const { title, notes } = req.body || {};
  const cfg = await QuizWeekConfig.findOneAndUpdate(
    { weekIndex },
    { $set: { title: title || '', notes: notes || '' } },
    { new: true, upsert: true }
  );
  res.json(cfg);
});

// ===== Generate quiz from week for a given date (支持按天/整周/指定天集三种模式) =====
router.post('/quiz-config/:weekIndex/generate', auth, requireTeacher, async (req, res) => {
  const weekIndex = Number(req.params.weekIndex);
  const {
    date,                   // 单天模式：具体 YYYY-MM-DD
    numQuestions = 5,
    difficulty = 'medium',  // 单天默认难度
    mode,                    // 'day' | 'week' | 'days'（可选，默认自动判断）
    days,                    // days 数组 [0..4]，仅当 mode==='days' 时生效
    difficulties             // 可选：每日难度映射 {0:'easy',1:'medium',...}
  } = req.body || {};

  const allowed = ['easy','medium','difficult'];
  const normLevel = lvl => (allowed.includes(lvl) ? lvl : 'medium');

  if (!Number.isInteger(weekIndex) || weekIndex < 1 || weekIndex > 12) {
    return res.status(400).json({ message: 'Invalid weekIndex' });
  }

  const cfg = await QuizWeekConfig.findOne({ weekIndex });
  if (!cfg || !cfg.pdfText) {
    return res.status(400).json({ message: 'No PDF uploaded for this week' });
  }

  // 读取课程设置以便按周/按天集计算具体日期
  const settings = await CourseSettings.findOne({ key: 'course' });
  const startDateStr = settings?.startDate || null;

  // —— 模式判定 ——
  let effectiveMode = mode;
  if (!effectiveMode) {
    if (Array.isArray(days) && days.length) effectiveMode = 'days';
    else if (date) effectiveMode = 'day';
    else effectiveMode = 'week'; // 默认整周
  }

  // —— 单天生成 ——
  if (effectiveMode === 'day') {
    const targetDate = (date && /\d{4}-\d{2}-\d{2}/.test(date)) ? date : isoDate();
    const level = normLevel(difficulty);

    const gen = await generateQuizFromContext({
      pdfText: cfg.pdfText,
      notes: cfg.notes,
      title: cfg.title,
      numQuestions,
      difficulty: level,
    });

    const doc = await DailyQuiz.findOneAndUpdate(
      { date: targetDate },
      { $set: { date: targetDate, weekIndex, questions: gen.questions, generatedAt: new Date(), difficulty: level } },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Generated (day)', date: doc.date, count: doc.questions.length, difficulty: level });
  }

  // —— 指定多天（days 数组）或整周 ——
  if (effectiveMode === 'days' || effectiveMode === 'week') {
    if (!startDateStr) {
      return res.status(400).json({ message: 'Start Date not configured. Please set /teacher/quiz-config startDate first.' });
    }

    const dayIndices = (effectiveMode === 'week')
      ? [0,1,2,3,4]
      : (Array.isArray(days) ? days.filter(d => Number.isInteger(d) && d >= 0 && d <= 4) : []);

    if (!dayIndices.length) {
      return res.status(400).json({ message: 'No valid days provided' });
    }

    const results = [];
    for (const dIdx of dayIndices) {
      const dayDate = dateForWeekDay(startDateStr, weekIndex, dIdx);
      if (!dayDate) continue;

      const lvl = normLevel(difficulties?.[dIdx] || difficulty);

      const gen = await generateQuizFromContext({
        pdfText: cfg.pdfText,
        notes: cfg.notes,
        title: cfg.title,
        numQuestions,
        difficulty: lvl,
      });

      const doc = await DailyQuiz.findOneAndUpdate(
        { date: dayDate },
        { $set: { date: dayDate, weekIndex, questions: gen.questions, generatedAt: new Date(), difficulty: lvl } },
        { new: true, upsert: true }
      );

      results.push({ date: doc.date, count: doc.questions.length, difficulty: lvl, dayIndex: dIdx });
    }

    return res.json({ message: `Generated (${effectiveMode})`, weekIndex, results });
  }

  // —— 未知模式 ——
  return res.status(400).json({ message: 'Unknown mode' });
});

module.exports = router;