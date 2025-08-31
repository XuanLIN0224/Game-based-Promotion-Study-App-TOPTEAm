/* APIs for the setting page */
const express = require('express');
const router = express.Router();
const { z } = require('zod');
// Using the token to varify the requesting user
const auth = require('../middleware/auth');

// Used behind the scene
const User = require('../models/User');

// Defines the validation rules
const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().min(1).max(50).optional()
});
const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  // 8, 'New password must be at least 8 characters'
  newPassword: z.string().min(1),
  newConfirmPassword: z.string().min(1)
});

// TEMP: public ping to prove mount
router.get('/ping', (req, res) => {
  console.log('[ROUTE] /api/setting/ping HIT');
  res.json({ ok: true });
});

// PATCH /api/setting/me
/* Update the user's email or username (and the "update date automatically") */
router.patch('/me', auth, async (req, res) => {
  // Validate the request body against schema (only username/email allowed)
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid field. Expecting the username and email' });

  // Read in the new pair
  const { username, email } = parsed.data;

  // Update the new pair for the given user
  if (username !== undefined) req.user.username = username;
  if (email !== undefined) req.user.email = email;

  // Update the 'last-update-date'
  // Done manually by the timestamps

  await req.user.save();
  // DB now up to date with the new pair

  res.json({ message: 'Updated', user: {
    email: req.user.email,
    username: req.user.username
  }});
});

// PATCH /api/setting/password
/* Update the user's email or username */
router.patch('/password', auth, async (req, res) => {
  // Validate the request body against schema (only username/email allowed)
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid field. Expecting three passwords' });

  // Read in the old, new, and new confirm passwords (from the request)
  const { oldPassword, newPassword, newConfirmPassword } = parsed.data;

  // Defensive Check
  if (!oldPassword || !newPassword || !newConfirmPassword) {
    return res.status(400).json({ message: "All password fields are required. Enter all three fields please" });
  }

  // S1: Check whether the old password is valid
  const match = await req.user.comparePassword(oldPassword);
  if (!match) return res.status(400).json({ message: 'Old password is incorrect. Try again or reset password' });

  // S2: Check whether the new and new confirm passwords are the same
  const same = (newPassword === newConfirmPassword);
  if(!same) return res.status(400).json({ message: 'New passwords do not match. Please try again' });

  // S3: Check whether the new and old passwords are the same--non-allowed behaviour
  const allowed = (newPassword === oldPassword);
  if(!allowed) return res.status(400).json({ message: 'The new password should not be the same as the old one. Please enter a different password' });

  // If both of the two checks are passed
  // Update the DB
  req.user.password = newPassword;

  // Optional but recommended: invalidate active token(s) so other sessions are logged out
  //req.user.activeToken = null;

  await req.user.save();

  res.json({ message: "Password updated successfully" });
});

module.exports = router;