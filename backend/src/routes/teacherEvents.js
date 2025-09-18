const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');

const router = express.Router();

/** Helpers (assume req.user is set by your auth middleware) */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
function requireTeacher(req, res, next) {
  // In your User model, isStudent=true by default. Treat teacher as isStudent=false
  if (!req.user || req.user.isStudent) return res.status(403).json({ error: 'Teacher only' });
  next();
}

async function computeTeamStats() {
  const agg = await User.aggregate([
    { $group: { _id: '$group', totalPetFood: { $sum: '$numPetFood' } } }
  ]);
  let cat = 0, dog = 0;
  for (const r of agg) {
    if (r._id === 'cat') cat = r.totalPetFood || 0;
    if (r._id === 'dog') dog = r.totalPetFood || 0;
  }
  const total = cat + dog;
  const pctCat = total ? Math.round((cat / total) * 1000) / 10 : 0;
  const pctDog = total ? Math.round((dog / total) * 1000) / 10 : 0;
  return { cat, dog, total, pctCat, pctDog };
}

/** Create event */
router.post('/', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, startAt, endAt, hints } = req.body;
    if (!name || !startAt || !endAt) return res.status(400).json({ error: 'name/startAt/endAt required' });

    const ev = await Event.create({
      name,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      hints: Array.isArray(hints) && hints.length ? hints : undefined,
      createdBy: req.user._id
    });
    res.json(ev);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'create failed' });
  }
});

/** Update event (name, times, hints) */
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, startAt, endAt, hints } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (startAt !== undefined) update.startAt = new Date(startAt);
    if (endAt !== undefined) update.endAt = new Date(endAt);
    if (Array.isArray(hints)) update.hints = hints;

    const ev = await Event.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!ev) return res.status(404).json({ error: 'not found' });
    res.json(ev);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'update failed' });
  }
});

/** Delete event */
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const ev = await Event.findByIdAndDelete(req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'delete failed' });
  }
});

/** List events (for teacher admin) */
router.get('/', requireAuth, requireTeacher, async (req, res) => {
  const events = await Event.find().sort({ startAt: -1 });
  res.json(events);
});

/** Event status (for teacher preview) */
router.get('/:id/status', requireAuth, requireTeacher, async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });

  const now = new Date();
  const running = now >= ev.startAt && now <= ev.endAt;
  const remainingMs = Math.max(0, ev.endAt - now);

  const stats = await computeTeamStats();

  const unlockedByTeam = {
    cat: ev.hints.filter(h => stats.cat >= h.threshold).map(h => h.threshold),
    dog: ev.hints.filter(h => stats.dog >= h.threshold).map(h => h.threshold),
  };

  res.json({
    event: ev,
    running,
    now,
    remainingMs,
    stats,
    unlockedByTeam,
    winner: ev.winner || null,
    settledAt: ev.settledAt || null
  });
});

module.exports = router;