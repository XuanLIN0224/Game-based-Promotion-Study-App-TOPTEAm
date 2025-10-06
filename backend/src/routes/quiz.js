const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DailyQuiz = require('../models/DailyQuiz');
const DailyUserQuizState = require('../models/DailyUserQuizState');
const CourseSettings = require('../models/CourseSettings');

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function weekdayIndex(dateStr) {
  // 0=Mon ... 4=Fri, Sat/Sun 返回 -1
  const d = new Date(dateStr + 'T00:00:00');
  const js = d.getDay(); // 0 Sun..6 Sat
  if (js === 0 || js === 6) return -1;
  return js - 1; // Mon(1) -> 0
}

// get today’s quiz + attempts left
router.get('/today', auth, async (req, res) => {
  const date = isoDate();
  const quiz = await DailyQuiz.findOne({ date });
  const idx = weekdayIndex(date);

  if (idx < 0) {
    return res.status(204).send(); // no quiz on weekends
  }
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length < 5) {
    return res.status(404).json({ message: 'No quiz for today' });
  }

  const single = quiz.questions[idx]; // 0..4 for Mon..Fri
  const projectedQuiz = {
    date: quiz.date,
    weekIndex: quiz.weekIndex,
    questions: [single],
    totalInWeek: quiz.questions.length // 5
  };

  const state = await DailyUserQuizState.findOne({ userId: req.user._id, date }) ||
    await DailyUserQuizState.create({ userId: req.user._id, date, attemptsAllowed: 1, attemptsUsed: 0 });

  res.json({
    date,
    quiz: projectedQuiz,
    attempts: {
      allowed: state.attemptsAllowed,
      used: state.attemptsUsed,
      left: Math.max(0, state.attemptsAllowed - state.attemptsUsed)
    },
    boosterActive: !!(req.user.boosterExpiresAt && new Date(req.user.boosterExpiresAt) > new Date()),
    boosterExpiresAt: req.user.boosterExpiresAt || null
  });
});

// backend/src/routes/quiz.js (you already have this file mounted at /api/quiz)
router.get('/archive', auth, async (req, res) => {
  // students & teachers can both view; restrict size
  const list = await DailyQuiz.find({}).sort({ date: -1 }).limit(50);
  res.json(list);
});

// consume inventory "extra_attempt" and grant +1 attempt today
router.post('/attempts/use-extra', auth, async (req, res) => {
  const date = isoDate();
  const inv = req.user.inventory || [];
  const row = inv.find(i => i.key === 'extra_attempt' && i.qty > 0);
  if (!row) return res.status(400).json({ message: 'No extra_attempt item' });

  row.qty -= 1;
  req.user.inventory = inv.filter(i => (i.key !== 'extra_attempt') || i.qty > 0);
  await req.user.save();

  const state = await DailyUserQuizState.findOneAndUpdate(
    { userId: req.user._id, date },
    { $inc: { attemptsAllowed: 1 } },
    { new: true, upsert: true }
  );
  res.json({
    message: 'Granted +1 attempt',
    attempts: {
      allowed: state.attemptsAllowed,
      used: state.attemptsUsed,
      left: Math.max(0, state.attemptsAllowed - state.attemptsUsed)
    }
  });
});

// submit answers
router.post('/attempt', auth, async (req, res) => {
  const { answers } = req.body || {}; // [0..3] per question
  const date = isoDate();
  const quiz = await DailyQuiz.findOne({ date });
  if (!quiz) return res.status(400).json({ message: 'No quiz for today' });

  const state = await DailyUserQuizState.findOne({ userId: req.user._id, date }) ||
    await DailyUserQuizState.create({ userId: req.user._id, date, attemptsAllowed: 1, attemptsUsed: 0 });

  if (state.attemptsUsed >= state.attemptsAllowed) {
    return res.status(400).json({ message: 'No attempts left' });
  }

  if (!Array.isArray(answers) || answers.length !== 1) {
    return res.status(400).json({ message: 'Answers length mismatch' });
  }

  // grade
  let correct = 0;
  const correctIndexes = quiz.questions.map(q => q.answerIndex);
  answers.forEach((a, i) => { if (Number(a) === correctIndexes[i]) correct += 1; });

  // award score: 10 per correct, *2 if booster active
  const base = correct * 10;
  const boosterActive = !!(req.user.boosterExpiresAt && new Date(req.user.boosterExpiresAt) > new Date());
  const award = boosterActive ? base * 2 : base;

  // update attempt count and score
  state.attemptsUsed += 1;
  await state.save();

  req.user.score = (req.user.score || 0) + award;
  await req.user.save();

  res.json({
    message: 'submitted',
    correct,
    total: quiz.questions.length,
    award,
    boosterApplied: boosterActive,
    correctIndexes
  });
});

module.exports = router;