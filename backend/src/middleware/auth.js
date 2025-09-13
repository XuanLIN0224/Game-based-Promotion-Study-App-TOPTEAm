/* Token middleware--for system safety--security gate */
const jwt = require('jsonwebtoken');    // The library to sign/verify token
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(decoded.userId).populate('breed');
    if (!u) return res.status(401).json({ message: 'Unauthorized' });

    const now = new Date();
    if (!u.activeToken || u.activeToken !== token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (u.tokenExpiresAt && now > new Date(u.tokenExpiresAt)) {
      u.activeToken = null;
      u.tokenExpiresAt = null;
      await u.save();
      return res.status(401).json({ message: 'Session expired' });
    }

    req.user = u;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
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