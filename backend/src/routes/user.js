const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const QRCode = require('../models/QRcode');

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
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Missing QR code' });
  }

  try {
    // 1) Try DB-backed QR first
    const qr = await QRCode.findOne({ code });
    if (qr) {
      // not yet active check
      if (qr.validFrom && qr.validFrom.getTime() > Date.now()) {
        return res.status(400).json({ message: 'QR code not active yet' });
      }
      // expiry check
      if (qr.validUntil && qr.validUntil.getTime() < Date.now()) {
        return res.status(400).json({ message: 'QR code expired' });
      }
      // double-scan check
      const uid = String(req.user._id);
      if (qr.usedBy.some(u => String(u) === uid)) {
        return res.status(400).json({ message: 'Code already used' });
      }

      // mark used & reward
      qr.usedBy.push(req.user._id);
      await qr.save();

      if (!Array.isArray(req.user.scannedCodes)) req.user.scannedCodes = [];
      req.user.scannedCodes.push(code);
      // reward strategy: +20 points (keep same as legacy)
      req.user.score = (req.user.score || 0) + 20;
      await req.user.save();

      return res.json({ message: 'Attendance recorded', score: req.user.score, type: qr.type, validUntil: qr.validUntil });
    }

    // 2) Fallback to legacy fixed codes in /public/qrcodes (optional compatibility)
    const VALID_CODES = Array.from({ length: 24 }, (_, i) => `reward:QR-${i + 1}`);
    if (!VALID_CODES.includes(code)) {
      return res.status(400).json({ message: 'Invalid QR code' });
    }

    if (!Array.isArray(req.user.scannedCodes)) req.user.scannedCodes = [];
    if (req.user.scannedCodes.includes(code)) {
      return res.status(400).json({ message: 'Code already used' });
    }

    req.user.score = (req.user.score || 0) + 2;
    req.user.scannedCodes.push(code);
    await req.user.save();

    return res.json({ message: 'OK', score: req.user.score });
  } catch (err) {
    console.error('POST /api/user/scan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;