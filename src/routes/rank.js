const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/top', auth, async (req, res) => {
    try {
    const total = await User.countDocuments({});
    const topNumber = Math.ceil(total * 0.2);   // top 20%
    const topUsers = await User.find({})
      .sort({ score: -1 }) // sort from highest to lowest 
      .limit(topNumber)
      .select('username score group breed');
    res.json(topUsers);
    } catch (err) {
    console.error(err);
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
