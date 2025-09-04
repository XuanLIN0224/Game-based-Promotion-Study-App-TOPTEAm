const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  res.json(req.user.inventory || []);
});

// POST /api/inventory/use { key, qty }
router.post('/use', auth, async (req, res) => {
  const { key, qty } = req.body || {};
  if (!key || !Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Invalid key/qty' });
  }
  const inv = req.user.inventory || [];
  const item = inv.find(i => i.key === key);
  if (!item || item.qty < qty) {
    return res.status(400).json({ message: 'Not enough items' });
  }
  item.qty -= qty;
  if (item.qty === 0) {
    // remove zero rows
    req.user.inventory = inv.filter(i => i.qty > 0);
  }
  await req.user.save();
  res.json({ message: 'Used', inventory: req.user.inventory });
});

module.exports = router;