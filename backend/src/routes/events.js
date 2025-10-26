/**
 * This file includes APIs (routes) used for the realization of the "Team Event & Hints" feature.
 *
 * Main Functions:
 * F1: Retrieve the currently active event within the active time range and display real-time team progress (cats vs dogs).
 * F2: Retrieve the status and progress of a specific event by its ID, showing hint unlocks based on team performance.
 */

const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
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

/** Get active event (now within [start,end]) */
// GET  /api/events/active
router.get('/active', requireAuth, async (req, res) => {
  const now = new Date();
  const ev = await Event.findOne({ startAt: { $lte: now }, endAt: { $gte: now } }).sort({ startAt: -1 });
  if (!ev) return res.json({ event: null });

  const stats = await computeTeamStats();

  const unlockedByTeam = {
    cat: ev.hints.filter(h => stats.cat >= h.threshold).map(h => h.threshold),
    dog: ev.hints.filter(h => stats.dog >= h.threshold).map(h => h.threshold),
  };

  // Determine what the current user can see
  const myGroup = req.user?.group; // 'cat' | 'dog'
  const visibleHints = ev.hints.map(h => {
    const unlocked = myGroup ? stats[myGroup] >= h.threshold : false;
    return {
      threshold: h.threshold,
      title: h.title,
      unlocked,
      // reveal content only if unlocked; locked shows threshold but empty content
      content: unlocked ? h.content : '',
    };
  });

  res.json({
    event: {
      _id: ev._id,
      name: ev.name,
      startAt: ev.startAt,
      endAt: ev.endAt,
    },
    now,
    remainingMs: Math.max(0, ev.endAt - now),
    stats,                 // totals + percentages
    hints: visibleHints,   // per-user visibility
    myGroup: myGroup || null,
    winner: ev.winner || null
  });
});

/** Get specific event status (readonly) */
// GET  /api/events/:id/status
router.get('/:id/status', requireAuth, async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });

  const now = new Date();
  const stats = await computeTeamStats();

  const myGroup = req.user?.group;
  const visibleHints = ev.hints.map(h => {
    const unlocked = myGroup ? stats[myGroup] >= h.threshold : false;
    return {
      threshold: h.threshold,
      title: h.title,
      unlocked,
      content: unlocked ? h.content : '',
    };
  });

  res.json({
    event: {
      _id: ev._id,
      name: ev.name,
      startAt: ev.startAt,
      endAt: ev.endAt,
    },
    now,
    remainingMs: Math.max(0, ev.endAt - now),
    stats,
    hints: visibleHints,
    myGroup: myGroup || null,
    winner: ev.winner || null
  });
});

module.exports = router;