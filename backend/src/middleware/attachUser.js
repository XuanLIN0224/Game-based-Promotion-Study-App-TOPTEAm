// backend/src/middleware/attachUser.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Attach req.user from Authorization: Bearer <token>
 * 只负责把用户挂到 req.user，不做 401 拦截；真正的权限判断交给各路由里的 requireAuth/requireTeacher。
 */
module.exports = async function attachUser(req, res, next) {
  try {
    // 预检请求直接放过（CORS）
    if (req.method === 'OPTIONS') return next();

    const auth = req.headers && req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return next();

    const token = auth.slice(7).trim();
    if (!token) return next();

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // token 过期/无效：不挂 user，继续到路由让 requireAuth 去 401
      return next();
    }

    // 兼容多种 payload 字段名
    const userId = payload.userId || payload.id || payload._id || payload.sub;
    if (!userId) return next();

    const user = await User.findById(userId).lean();
    if (user) req.user = user;

    return next();
  } catch (err) {
    // 任何异常都不要阻断请求流
    return next();
  }
};