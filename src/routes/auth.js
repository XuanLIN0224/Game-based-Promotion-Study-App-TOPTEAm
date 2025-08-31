const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

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
// 用户注册的第一步接口
router.post('/register/step1', async (req, res) => {
  const parsed = registerStep1Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map(e => e.message).join(', ') });
  }
  const { email, username, password, group } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  // 先创建用户但不绑定 breed（Step2 再选）
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

  // 关键校验：breed.group 必须与 user.group 一致
  if (breed.group !== user.group) {
    return res.status(400).json({ message: 'Breed group mismatch' });
  }

  user.breed = breed._id;
  await user.save();

  //生成登录用的 JWT， 存储 token
  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  user.activeToken = token; // 可选：单会话
  await user.save();

  // 返回一个 JSON， 提示注册成功
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

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid credentials' });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email }).populate('breed');
  if (!user) return res.status(401).json({ message: 'User not found' });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid password' });

  // 单会话控制（可选）
  if (user.activeToken) {
    try {
      jwt.verify(user.activeToken, process.env.JWT_SECRET);
      return res.status(409).json({ message: 'Account is logged in elsewhere' });
    } catch {
      user.activeToken = null;
      await user.save();
    }
  }

  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  user.activeToken = token;
  await user.save();

  return res.json({
    message: 'Login successful',
    token,
    user: {
      email: user.email,
      username: user.username,
      group: user.group,
      breed: user.breed ? { id: user.breed._id, name: user.breed.name, group: user.breed.group } : null,
      score: user.score,
      numPetFood: user.numPetFood,
      clothingConfig: user.clothingConfig
    }
  });
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  req.user.activeToken = null;
  await req.user.save();
  res.json({ message: 'Logged out' });
});

// POST /api/auth/forgot-password  -> 发送6位验证码
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) return res.status(400).json({ message: 'Email required' });

  const user = await User.findOne({ email });
  // 避免暴露是否注册：统一返回成功
  if (!user) return res.json({ message: 'If the email exists, a code has been sent' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await PasswordResetCode.create({ email, code, expiresAt, used: false });
  try {
    await sendResetCodeEmail(email, code);
  } catch (e) {
    console.error('Email send error:', e);
    // 仍返回成功，避免撞库
  }
  res.json({ message: 'If the email exists, a code has been sent' });
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6).max(100),
});

// POST /api/auth/reset-password  -> 使用验证码重置
router.post('/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid request' });

  const { email, code, newPassword } = parsed.data;
  const rec = await PasswordResetCode.findOne({ email, code, used: false });
  if (!rec) return res.status(400).json({ message: 'Invalid or expired code' });
  if (rec.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired code' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.password = newPassword; // 触发 pre-save hash
  await user.save();

  rec.used = true;
  await rec.save();

  res.json({ message: 'Password successfully reset' });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const u = req.user;
  res.json({
    email: u.email,
    username: u.username,
    group: u.group,
    breed: u.breed ? { id: u.breed._id, name: u.breed.name, group: u.breed.group } : null,
    score: u.score,
    numPetFood: u.numPetFood,
    clothingConfig: u.clothingConfig
  });
});

module.exports = router;