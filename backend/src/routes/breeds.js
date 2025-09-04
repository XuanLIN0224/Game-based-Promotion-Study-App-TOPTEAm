const express = require('express');
const router = express.Router();
const Breed = require('../models/Breed');

// GET /api/breeds?group=dog|cat
router.get('/', async (req, res) => {
  const { group } = req.query;
  const q = group ? { group } : {};
  const breeds = await Breed.find(q).sort({ group: 1, name: 1 });
  res.json(breeds);
});

// 一次性种子：GET /api/breeds/seed  (部署后可注释/移除)
router.get('/seed', async (req, res) => {
  const seed = [
    { group: 'dog', name: 'Border collie' },
    { group: 'dog', name: 'Dachshund' },
    { group: 'dog', name: 'Samoyed' },
    { group: 'dog', name: 'Toy poodle' },
    { group: 'cat', name: 'Yellow cat' },
    { group: 'cat', name: 'Grey cat' },
    { group: 'cat', name: 'Black cat' },
    { group: 'cat', name: 'White cat' },
  ];
  for (const b of seed) {
    await Breed.updateOne(b, { $setOnInsert: b }, { upsert: true });
  }
  res.json({ message: 'breeds seeded' });
});

module.exports = router;