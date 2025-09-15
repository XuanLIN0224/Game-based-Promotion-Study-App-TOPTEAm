const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');

const router = express.Router();

const updateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  clothingConfig: z.record(z.any()).optional()
});

// PATCH /api/user/me
router.patch('/me', auth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid fields' });

  const { username, clothingConfig } = parsed.data;
  if (username !== undefined) req.user.username = username;
  if (clothingConfig !== undefined) req.user.clothingConfig = clothingConfig;

  await req.user.save();
  res.json({ message: 'Updated', user: {
    email: req.user.email,
    username: req.user.username,
    group: req.user.group,
    score: req.user.score,
    numPetFood: req.user.numPetFood,
    clothingConfig: req.user.clothingConfig
  }});
});


// POST /api/user/scan
router.post('/scan', auth, async (req, res) => {
  const { code } = req.body;

  const VALID_CODES = Array.from({ length: 24 }, (_, i) => `reward:QR-${i + 1}`);

  if (!VALID_CODES.includes(code)) {
    return res.status(400).json({ message: 'Invalid QR code' });
  }

  if (req.user.scannedCodes.includes(code)) {
    return res.status(400).json({ message: 'Code already used' });
  }

  req.user.score += 2; 
  req.user.scannedCodes.push(code);
  await req.user.save();

  res.json({ message: 'OK', score: req.user.score });
});
module.exports = router;