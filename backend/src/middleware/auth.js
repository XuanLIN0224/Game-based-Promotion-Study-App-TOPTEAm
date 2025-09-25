/**
 * This file implements the token middleware.
 * It is built for system safety, acting like a security gate.
 */

const jwt = require('jsonwebtoken');    // The library to sign/verify token
const User = require('../models/User');

// Run before the actual route handler
// Check whether the request has a valid token and attach the user (making request) or not
module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  // If token not found
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Verify the token using a security key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Finds the user database
    const user = await User.findById(decoded.userId).populate('breed');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    // If everything is valid
    // s1: Attach the (requesting) user object to "req.user"
    req.user = user;
    // s2: Call "next()" and continue to the real route handler
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};