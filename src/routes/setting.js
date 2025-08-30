const express = require('express');
const router = express.Router();
const { z } = require('zod');
const auth = require('../middleware/auth');

// Used behind the scene
const User = require('../models/User');

// Defines the validation rules
const updateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().min(1).max(50).optional()
});

// TEMP: public ping to prove mount
router.get('/ping', (req, res) => {
  console.log('[ROUTE] /api/setting/ping HIT');
  res.json({ ok: true });
});

// PATCH /api/setting/me
/* Update the user's email or username */
router.patch('/me', auth, async (req, res) => {
  // Debug
  console.log("HERE")
  // Validate the request body against schema (only username/email allowed)
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid field. Expecting the username and email' });

  // Read in the new pair
  const { username, email } = parsed.data;

  // Update the new pair for the given user
  if (username !== undefined) req.user.username = username;
  if (email !== undefined) req.user.email = email;

  await req.user.save();
  // DB now up to date with the new pair

  res.json({ message: 'Updated', user: {
    email: req.user.email,
    username: req.user.username
  }});
});

module.exports = router;