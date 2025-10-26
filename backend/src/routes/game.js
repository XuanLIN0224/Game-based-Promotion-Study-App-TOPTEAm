const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');

const router = express.Router();

const deltaSchema = z.object({
  scoreDelta: z.number().int().optional(),
  petFoodDelta: z.number().int().optional()
});

// PATCH /game/reward
router.patch('/reward', auth, async (req, res) => {
  const parsed = deltaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid delta' });

  const { scoreDelta = 0, petFoodDelta = 0 } = parsed.data;

  if (Math.abs(scoreDelta) > 100 || Math.abs(petFoodDelta) > 100) {
    return res.status(400).json({ message: 'Delta too large' });
  }

  req.user.score += scoreDelta;
  req.user.numPetFood += petFoodDelta;
  await req.user.save();

  res.json({
    message: 'Updated',
    score: req.user.score,
    numPetFood: req.user.numPetFood
  });
});

module.exports = router;