/**
 * This file includes APIs (routes) used for the realization of the "Daily Quiz" feature.
 *
 * Main Functions:
 * F1: Serve today’s quiz question (1 per weekday) with the user’s attempt state and booster status.
 * F2: Provide a paginated-lite archive (up to 50) of stored weekly quiz documents for browsing.
 * F3: Consume an "extra_attempt" inventory item to grant +1 attempt for today and return the new attempt counters.
 * F4: Accept today’s quiz submission, check correctness, apply scoring (booster doubles), persist attempt usage, and return the result.
 */

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

// 计算今天属于第几周（基于 settings.startDate 是第 1 周的周一）
function weekIndexForDate(startDateStr, dateStr) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr + 'T00:00:00');
  const cur = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor((cur - start) / 86400000);
  const idx = Math.floor(diffDays / 7) + 1; // week 1 starts at startDate (Mon)
  return idx >= 1 ? idx : null;
}

// 查找本周的 quiz 文档（优先找周一那条；找不到就取该 weekIndex 最早的一条）
async function findWeeklyQuizDoc(dateStr) {
  const settings = await CourseSettings.findOne({ key: 'course' });
  const startDate = settings?.startDate || null;

  // 兼容：若没设置 startDate，退回到老逻辑（按当天 date 找）
  if (!startDate) {
    return await DailyQuiz.findOne({ date: dateStr });
  }

  const wIdx = weekIndexForDate(startDate, dateStr);
  if (!wIdx) return null;

  // 优先周一
  const start = new Date(startDate + 'T00:00:00');
  const monday = new Date(start);
  monday.setDate(start.getDate() + (wIdx - 1) * 7); // 本周周一
  const mondayStr = isoDate(monday);

  let doc = await DailyQuiz.findOne({ date: mondayStr, weekIndex: wIdx });
  if (doc) return doc;

  // 其次：该周的任何一条（例如之前历史数据）
  doc = await DailyQuiz.findOne({ weekIndex: wIdx }).sort({ date: 1 });
  return doc;
}

// get today’s quiz + attempts left（从本周周一的 quiz 里切出今天那 1 题）
router.get('/today', auth, async (req, res) => {
  const today = isoDate();
  const idx = weekdayIndex(today); // 0..4 for Mon..Fri; -1 for weekend
  if (idx < 0) return res.status(204).send(); // 周末无题

  // 找本周的 quiz 文档（只保存于周一）
  const quiz = await findWeeklyQuizDoc(today);
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length < 1) {
    return res.status(404).json({ message: 'No quiz for this week' });
  }

  // 只给当天那 1 题（若题目不到 5，则取 idx 可用范围）
  const safeIdx = Math.min(idx, quiz.questions.length - 1);
  const single = quiz.questions[safeIdx];
  const projectedQuiz = {
    date: quiz.date,         // 周一的日期
    weekIndex: quiz.weekIndex,
    questions: [single],     // 今天这一题
    totalInWeek: quiz.questions.length
  };

  // 当天的作答状态仍按“今天”记（不跟周一走）
  const state = await DailyUserQuizState.findOne({ userId: req.user._id, date: today }) ||
    await DailyUserQuizState.create({ userId: req.user._id, date: today, attemptsAllowed: 1, attemptsUsed: 0 });

  res.json({
    date: today, // 今天
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

// submit answers（按今天是周几，从周一文档切 1 题来判分）
router.post('/attempt', auth, async (req, res) => {
  const { answers } = req.body || {}; // [singleAnswerIndex]
  const today = isoDate();
  const idx = weekdayIndex(today); // 0..4
  if (idx < 0) return res.status(400).json({ message: 'No quiz on weekends' });

  const quiz = await findWeeklyQuizDoc(today);
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length < 1) {
    return res.status(400).json({ message: 'No quiz for this week' });
  }

  const state = await DailyUserQuizState.findOne({ userId: req.user._id, date: today }) ||
    await DailyUserQuizState.create({ userId: req.user._id, date: today, attemptsAllowed: 1, attemptsUsed: 0 });

  if (state.attemptsUsed >= state.attemptsAllowed) {
    return res.status(400).json({ message: 'No attempts left' });
  }

  if (!Array.isArray(answers) || answers.length !== 1) {
    return res.status(400).json({ message: 'Answers length mismatch' });
  }

  // 只判今天这 1 题（若题目不到 5，则用最后一题）
  const safeIdx = Math.min(idx, quiz.questions.length - 1);
  const correctIndex = quiz.questions[safeIdx]?.answerIndex ?? 0;
  const isCorrect = Number(answers[0]) === Number(correctIndex);
  const correct = isCorrect ? 1 : 0;

  // 计分：每题 10 分，booster *2
  const base = correct * 10;
  const boosterActive = !!(req.user.boosterExpiresAt && new Date(req.user.boosterExpiresAt) > new Date());
  const award = boosterActive ? base * 2 : base;

  // 更新尝试次数 & 积分（当天维度）
  state.attemptsUsed += 1;
  await state.save();

  req.user.score = (req.user.score || 0) + award;
  await req.user.save();

  res.json({
    message: 'submitted',
    correct,
    total: 1,
    award,
    boosterApplied: boosterActive,
    // 为了前端显示解释：告诉它今天题目的正确选项索引
    correctIndexes: [correctIndex]
  });
});

module.exports = router;