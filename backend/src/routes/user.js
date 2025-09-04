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

module.exports = router;