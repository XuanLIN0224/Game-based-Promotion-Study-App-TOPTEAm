/**
 * This file includes APIs (routes) used for the realization of the "Shop" feature.
 *
 * Main Functions:
 * F1: Provide a weekly catalog for the authenticated user showing each item’s price, purchased count this week, and remaining quota.
 * F2: Handle item purchases by validating limits and balance, applying effects to the user (inventory/counter), recording the transaction, and returning the updated state.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Purchase = require('../models/Purchase');

/**
 * Catalog (MVP hard-coded)
 * price：regard the user's score as the currency and reduce the total score of the user when performing purchase
 * weeklyLimit：the limit that a user is able to buy a specific item for a specific week
 * types：
 *   - inventory：added directly to the inventory list for a specific user
 *   - counter：added directly to a field (e.g., pet_food) for a specific user
 *   - booster：set power-up effect fields for a specific user
 */
const CATALOG = {
  extra_attempt:       { title: 'Extra Quiz Attempt',    weeklyLimit: 2,  type: 'inventory', price: 20 },
  quiz_booster_today:  { title: 'Quiz Booster (Today)',  weeklyLimit: 1,  type: 'inventory', price: 30 },
  lecture_qr:          { title: 'Lecture QR Code',       weeklyLimit: 1,  type: 'inventory', price: 10 },
  pet_food:            { title: 'Pet Food',              weeklyLimit: 20, type: 'counter',   price: 1  },
  lollies_voucher:     { title: 'Lollies Voucher',       weeklyLimit: 1,  type: 'inventory', price: 5  },
};

// === helpers ===
function isoWeekKey(date = new Date()) {
  // Returns ISO week key like "2025-W35"
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const ww = String(weekNo).padStart(2, '0');
  return `${d.getUTCFullYear()}-W${ww}`;
}

function endOfToday() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

// === routes ===

// GET /api/shop/catalog
/* List out the total power-ups that have been already bought by the (specific) user and the user's remaining balance for the current week */
// list of items with user's purchased count and remaining quota
router.get('/catalog', auth, async (req, res) => {
  const week = isoWeekKey();
  const userId = req.user._id;

  // summarize purchases this week
  const purchases = await Purchase.aggregate([
    { $match: { userId, weekStartISO: week } },
    { $group: { _id: '$itemKey', total: { $sum: '$qty' } } }
  ]);
  const usedMap = Object.fromEntries(purchases.map(p => [p._id, p.total]));

  const list = Object.entries(CATALOG).map(([key, meta]) => {
    const used = usedMap[key] || 0;
    const remaining = Math.max(0, meta.weeklyLimit - used);
    return { key, ...meta, used, remaining };
  });

  res.json(list);
});

// POST /api/shop/purchase { itemKey, qty }
router.post('/purchase', auth, async (req, res) => {
  const { itemKey, qty } = req.body || {};
  if (!itemKey || !Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Invalid itemKey/qty' });
  }
  const meta = CATALOG[itemKey];
  if (!meta) return res.status(400).json({ message: 'Unknown item' });

  const week = isoWeekKey();
  const userId = req.user._id;

  // allowance check
  const agg = await Purchase.aggregate([
    { $match: { userId, itemKey, weekStartISO: week } },
    { $group: { _id: null, total: { $sum: '$qty' } } }
  ]);
  const used = agg.length ? agg[0].total : 0;
  const remaining = meta.weeklyLimit - used;
  if (remaining <= 0 || qty > remaining) {
    return res.status(400).json({ message: `Weekly limit reached. Remaining: ${Math.max(0, remaining)}` });
  }

  // cleanse qty to not exceed remaining
  const pricePerUnit = meta.price || 0;
  const totalCost = pricePerUnit * qty;
  const balance = req.user.score || 0;
  if (balance < totalCost) {
    return res.status(400).json({ message: `Not enough score. Need ${totalCost}, you have ${balance}.` });
  }
  req.user.score = balance - totalCost;

  // apply item effect
  if (meta.type === 'inventory') {
    const inv = req.user.inventory || [];
    const row = inv.find(i => i.key === itemKey);
    if (row) row.qty += qty;
    else inv.push({ key: itemKey, qty });
    req.user.inventory = inv;
  } else if (meta.type === 'counter') {
    if (itemKey === 'pet_food') {
      req.user.numPetFood = (req.user.numPetFood || 0) + qty;
    } else {
      return res.status(400).json({ message: 'Unsupported counter item' });
    }
  }else {
    return res.status(400).json({ message: 'Unsupported item type' });
  }

  // record purchase
  await Purchase.create({ userId, itemKey, qty, weekStartISO: week });
  await req.user.save();

  return res.json({
    message: 'Purchased',
    itemKey,
    qty,
    remaining: remaining - qty,
    user: {
      score: req.user.score,
      numPetFood: req.user.numPetFood,
      boosterExpiresAt: req.user.boosterExpiresAt,
      inventory: req.user.inventory
    }
  });
});

module.exports = router;