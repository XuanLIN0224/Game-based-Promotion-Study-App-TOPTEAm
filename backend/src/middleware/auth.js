/* Token middleware--for system safety--security gate */
const jwt = require('jsonwebtoken');    // The library to sign/verify token
const user = require('../models/User');

// Run before the actual route handler
// Check whether the request has a valid token and attach the user (making request) or not
module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  // If token not found
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  // Enforce single-session & expiry: token must match DB and not be expired
  const now = new Date();
  if (!user.activeToken || user.activeToken !== token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (user.tokenExpiresAt && now > new Date(user.tokenExpiresAt)) {
    // Auto clean up expired token
    user.activeToken = null;
    user.tokenExpiresAt = null;
    await user.save();
    return res.status(401).json({ message: 'Session expired' });
  }


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