/**
 * This file includes APIs (routes) used for the realization of the "Account Settings" feature.
 *
 * Main Functions:
 * F0: Provide a public ping endpoint to verify the settings router is mounted.
 * F1: Update profile fields (username/email) for the authenticated user with schema validation.
 * F2: Reset the authenticated user’s password: verify old password, validate and confirm new password, and persist securely.
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const bcrypt = require('bcrypt');
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
/* Update the user's password */
router.patch('/password', auth, async (req, res) => {
  // Validate the request body against schema (old/new/newConfirm required)
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid field. Expecting three passwords' });
  }

  const { oldPassword, newPassword, newConfirmPassword } = parsed.data;

  // Defensive checks
  if (!oldPassword || !newPassword || !newConfirmPassword) {
    return res.status(400).json({ message: 'All password fields are required. Enter all three fields please' });
  }

  // Ensure current user record has a password in DB
  if (!req.user.password || typeof req.user.password !== 'string') {
    return res.status(500).json({ message: 'Account has no password set. Please reset your password via "Forgot password".' });
  }

  // If somehow the stored password is not a bcrypt hash (e.g., legacy/plaintext), migrate it
  if (!req.user.password.startsWith('$2')) {
    try {
      const salt0 = await bcrypt.genSalt(10);
      req.user.password = await bcrypt.hash(req.user.password, salt0);
      await req.user.save();
    } catch (e) {
      console.error('[setting/password] migrate plaintext password error:', e);
      return res.status(500).json({ message: 'Server error while migrating password' });
    }
  }

  // 1) Verify old password
  let isMatch = false;
  try {
    isMatch = await bcrypt.compare(oldPassword, req.user.password);
  } catch (e) {
    console.error('[setting/password] bcrypt.compare error:', e);
    return res.status(500).json({ message: 'Server error during password verification' });
  }
  if (!isMatch) {
    return res.status(400).json({ message: 'Old password is incorrect. Try again or reset password' });
  }

  // 2) New passwords must match
  if (newPassword !== newConfirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match. Please try again' });
  }

  // 3) New must be different from old
  if (newPassword === oldPassword) {
    return res.status(400).json({ message: 'The new password should not be the same as the old one. Please enter a different password' });
  }

  // 4) Save new password 
  try {
    req.user.password = newPassword;

    // Optional: invalidate active token(s) so other sessions are logged out
    // req.user.activeToken = null;

    await req.user.save();
  } catch (e) {
    console.error('[setting/password] save new hash error:', e);
    return res.status(500).json({ message: 'Server error while saving new password' });
  }

  res.json({ message: 'Password updated successfully' });
});

module.exports = router;