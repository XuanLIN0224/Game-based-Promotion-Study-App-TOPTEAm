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

// ===== GET current config =====
router.get('/quiz-config', auth, requireTeacher, async (req, res) => {
  const [settings, weeks] = await Promise.all([
    CourseSettings.findOne({ key: 'course' }),
    QuizWeekConfig.find({}).sort({ weekIndex: 1 })
  ]);
  res.json({
    startDate: settings?.startDate || null,
    weeks
  });
});

// ===== PATCH start date =====
router.patch('/quiz-config/start-date', auth, requireTeacher, async (req, res) => {
  const { startDate } = req.body || {};
  if (!/\\d{4}-\\d{2}-\\d{2}/.test(startDate || '')) {
    return res.status(400).json({ message: 'Invalid startDate (YYYY-MM-DD)' });
  }
  const doc = await CourseSettings.findOneAndUpdate(
    { key: 'course' },
    { $set: { startDate } },
    { new: true, upsert: true }
  );
  res.json({ startDate: doc.startDate });
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

// ===== Generate quiz from week for a given date (default today) =====
router.post('/quiz-config/:weekIndex/generate', auth, requireTeacher, async (req, res) => {
  const weekIndex = Number(req.params.weekIndex);
  const { date, numQuestions = 5 } = req.body || {};
  if (!Number.isInteger(weekIndex) || weekIndex < 1 || weekIndex > 12) {
    return res.status(400).json({ message: 'Invalid weekIndex' });
  }
  const targetDate = date && /\\d{4}-\\d{2}-\\d{2}/.test(date) ? date : isoDate();
  const cfg = await QuizWeekConfig.findOne({ weekIndex });
  if (!cfg || !cfg.pdfText) {
    return res.status(400).json({ message: 'No PDF uploaded for this week' });
  }

  const gen = await generateQuizFromContext({
    pdfText: cfg.pdfText,
    notes: cfg.notes,
    title: cfg.title,
    numQuestions
  });

  const doc = await DailyQuiz.findOneAndUpdate(
    { date: targetDate },
    { $set: { date: targetDate, weekIndex, questions: gen.questions, generatedAt: new Date() } },
    { new: true, upsert: true }
  );

  res.json({ message: 'Generated', date: doc.date, count: doc.questions.length });
});

module.exports = router;