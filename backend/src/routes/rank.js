const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const AccessoryItem = require('../models/Accessories')

const router = express.Router();


// GET /api/rank/top？percent=20
router.get('/top', /* auth, */ async (req, res) => {
  try {
    const percentage = Math.max(1, Math.min(100, Number(req.query.percent) || 20));
    const total = await User.countDocuments({});
    if (total === 0) return res.json([]);

    const topN = Math.max(1, Math.ceil(total * (percentage / 100)));

    // sort rule (as you had)
    const leader = await User.findOne({}).sort({ score: -1 }).select('score').lean();
    const maxScore = leader?.score ?? 0;
    const sort  = maxScore === 0 ? { createdAt: -1 } : { score: -1, updatedAt: -1 };

    // Fetch top users
    const rows = await User.find({})
      .sort(sort)
      .limit(topN)
      .select('username score group breed')
      .lean();

    if (rows.length === 0) return res.json([]);

    // Fetch equipped accessories for these users in one query
    const ids = rows.map(u => u._id);
    const equippedDocs = await AccessoryItem.find(
      { userId: { $in: ids }, equipped: true },
      { userId: 1, itemName: 1, _id: 0 }
    ).lean();

    // Map userId -> itemName
    const equippedMap = new Map(
      equippedDocs.map(d => [String(d.userId), d.itemName])
    );

    // Attach equippedKey to rows
    const enriched = rows.map(u => ({
      ...u,
      equippedKey: equippedMap.get(String(u._id)) || ""
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('rank/top error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// router.get('/top', auth, async (req, res) => {
//   try {
//     const total = await User.countDocuments({});
//     if (total === 0) return res.json([]);
//     const topNumber = Math.max(1, Math.ceil(total * 0.2));
//     const topUsers = await User.find({})
//       .sort({ score: -1, updatedAt: -1 })
//       .limit(topNumber)
//       .select('username score group breed')
//       .lean();
//     res.json(topUsers);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

module.exports = router;
