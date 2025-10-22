/**
 * This file implements the token middleware.
 * It is built for system safety, acting like a security gate.
 */

const jwt = require('jsonwebtoken');    // The library to sign/verify token
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: false });

    // check expiration
    if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ message: 'Token expired' });
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth middleware error]', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};