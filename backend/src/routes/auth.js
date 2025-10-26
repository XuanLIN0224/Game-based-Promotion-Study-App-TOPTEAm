/**
 * This file includes APIs (routes) used for the realization of the "Authentication & Account" feature.
 *
 * Main Functions:
 * F1: Register (step 1) — create a user without breed using { email, username, password, confirmPassword, group }.
 * F2: Register (step 2) — bind a breed to the user, enforce group match, issue JWT (respecting "remember"), and return user summary.
 * F3: Login — verify email/password; if an existing valid token is stored, block concurrent sessions; otherwise issue a new JWT and return user summary.
 * F4: Logout — clear the stored active token for the authenticated user.
 * F5: Forgot password — generate and email a 6-digit reset code; always respond with a generic success to prevent user enumeration.
 * F6: Reset password — verify { email, code } and set newPassword; mark the code as used.
 * F7: Me — return the authenticated user’s profile with populated breed and key fields.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Breed = require('../models/Breed');
const PasswordResetCode = require('../models/PasswordResetCode');
const { sendResetCodeEmail } = require('../utils/email');
const auth = require('../middleware/auth');

const router = express.Router();

const registerStep1Schema = z.object({
  email: z.string().email().max(50),
  username: z.string().min(1).max(50),
  password: z.string().min(6).max(100),
  confirmPassword: z.string(),
  group: z.enum(['dog', 'cat'])
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

// POST /api/auth/register/step1
/* Store in email, username, password, and group */
router.post('/register/step1', async (req, res) => {
  const parsed = registerStep1Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map(e => e.message).join(', ') });
  }
  const { email, username, password, group } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  // first step ok, create user record with basic info
  const user = new User({ email, username, password, group });
  await user.save();

  return res.json({ message: 'Step1 ok, proceed to step2', email, group });
});

const registerStep2Schema = z.object({
  email: z.string().email().max(50),
  breedId: z.string().length(24) // ObjectId
});

// POST /api/auth/register/step2
router.post('/register/step2', async (req, res) => {
  const parsed = registerStep2Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  const { email, breedId } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const breed = await Breed.findById(breedId);
  if (!breed) return res.status(400).json({ message: 'Invalid breed' });

  // breed.group has to be same as user.group
  if (breed.group !== user.group) {
    return res.status(400).json({ message: 'Breed group mismatch' });
  }

  user.breed = breed._id;
  await user.save();

  //generate JWT token
  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const remember = !!req.body.remember;              // 前端可传
  const ttlMs = (remember ? 7 : 1) * 24*60*60*1000;  // 7天或1天
  user.activeToken = token;
  user.tokenExpiresAt = new Date(Date.now() + ttlMs);
  await user.save();

  // return user info + token
  return res.json({
    message: 'Registration completed',
    token,
    user: {
      email: user.email,
      username: user.username,
      group: user.group,
      breed: { id: breed._id, name: breed.name, group: breed.group },
      score: user.score,
      numPetFood: user.numPetFood,
      clothingConfig: user.clothingConfig
    }
  });
});

const loginSchema = z.object({
  email: z.string().email().max(50),
  password: z.string().min(1)
});
// =================== LOGIN ===================
router.post('/login', async (req, res) => {
  const { email, password, remember } = req.body || {};

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    // this is the token presented by the client (if any)
    const incomingToken = req.header('Authorization')?.replace('Bearer ', '') || null;

    // check if user already has a valid token
    if (user.token) {
      let stillValid = false;
      try {
        const decoded = jwt.verify(user.token, process.env.JWT_SECRET, { ignoreExpiration: false });
        stillValid = !!decoded && decoded.exp * 1000 > Date.now();
      } catch { /* expired */ }

      if (stillValid) {
        // if the incoming token matches the stored one, allow re-login
        if (incomingToken && incomingToken === user.token) {
          return res.json({ token: user.token, message: 'Login successful' });
        }
        // otherwise, block login to prevent concurrent sessions
        return res.status(409).json({ message: 'Already logged in somewhere else' });
      }
    }

    // if no valid token, generate a new one
    const expiresIn = remember ? '7d' : '1d';
    const token = jwt.sign(
      { id: user._id, isStudent: user.isStudent },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    user.token = token;
    await user.save();

    const populatedUser = await User.findById(user._id).populate('breed', 'name group');
    res.json({
      token,
      message: 'Login successful',
      user: {
        email: populatedUser.email,
        username: populatedUser.username,
        group: populatedUser.group,
        breed: populatedUser.breed ? { id: populatedUser.breed._id, name: populatedUser.breed.name, group: populatedUser.breed.group } : null,
        score: populatedUser.score,
        numPetFood: populatedUser.numPetFood,
        clothingConfig: populatedUser.clothingConfig,
      }
    });
  } catch (err) {
    console.error('POST /auth/login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  req.user.activeToken = null;
  await req.user.save();
  res.json({ message: 'Logged out' });
});

// POST /api/auth/forgot-password  -> send reset code
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) return res.status(400).json({ message: 'Email required' });

  const user = await User.findOne({ email });
  // avid to reveal whether email exists
  if (!user) return res.json({ message: 'If the email exists, a code has been sent' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await PasswordResetCode.create({ email, code, expiresAt, used: false });
  try {
    await sendResetCodeEmail(email, code);
  } catch (e) {
    console.error('Email send error:', e);
    // if email fails, still respond ok to avoid info leak
  }
  res.json({ message: 'If the email exists, a code has been sent' });
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6).max(100),
});

// POST /api/auth/reset-password  -> use reset code to set new password
router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid request' });

  const { email, code, newPassword } = parsed.data;
  const rec = await PasswordResetCode.findOne({ email, code, used: false });
  if (!rec) return res.status(400).json({ message: 'Invalid or expired code' });
  if (rec.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired code' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);
  user.password = hashed;
  await user.save();

  rec.used = true;
  await rec.save();

  res.json({ message: 'Password successfully reset' });
});

// GET /api/auth/me
// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  console.log('[ROUTE] /api/auth/me HIT');

  // check again and populate breed
  const u = await User.findById(req.user._id).populate('breed', 'name group');

  console.log('createdAt:', u?.createdAt, 'updatedAt:', u?.updatedAt);

  res.json({
    email: u.email,
    username: u.username,
    group: u.group,
    breed: u.breed ? { id: u.breed._id, name: u.breed.name, group: u.breed.group } : null,
    score: u.score,
    numPetFood: u.numPetFood,
    clothingConfig: u.clothingConfig,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    isStudent: u.isStudent === undefined ? true : !!u.isStudent
  });
});

module.exports = router;