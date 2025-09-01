const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();


// GET /api/rank/top?percent=20
router.get('/top', /* auth, */ async (req, res) => {
  try {
    const pct = Math.max(1, Math.min(100, Number(req.query.percent) || 20)); // 1..100
    const total = await User.countDocuments({});
    if (total === 0) return res.json([]);

    // 至少返回 1 名
    const topN = Math.max(1, Math.ceil(total * (pct / 100)));

    // 如果最高分是 0，就按注册时间返回，保证有列表可看
    const leader = await User.findOne({}).sort({ score: -1 }).select('score').lean();
    const maxScore = leader?.score ?? 0;

    const query = User.find({});
    const sort  = maxScore === 0 ? { createdAt: -1 } : { score: -1, updatedAt: -1 };

    const rows = await query
      .sort(sort)
      .limit(topN)
      .select('username score group breed') // _id 默认会带上
      .lean();

    res.json(rows);
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
