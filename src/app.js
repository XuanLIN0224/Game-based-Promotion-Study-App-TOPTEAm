const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

dotenv.config();

// // 为了连接
// const dns = require('dns');
// dns.setServers(['8.8.8.8', '1.1.1.1']);    // 强制使用稳定 DNS
// require('dns').setDefaultResultOrder('ipv4first');

const app = express();
app.use(helmet());
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// 安全限流（对认证与邮件相关接口）
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});
app.use(['/api/auth', '/api/user', '/api/game'], authLimiter);

// 路由
const authRoutes = require('./routes/auth');
const breedRoutes = require('./routes/breeds');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/game');
const inventoryRoutes = require('./routes/inventory');
const shopRoutes = require('./routes/shop');
//const rankRoutes = require('./routes/rank')

app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/setting', settingRoutes);
app.get('/', (req, res) => res.send('TOPTEAM API OK'));
app.use('/api/auth', authRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
//app.use('/api/rank', rankRoutes);

console.log('[BOOT] app mounting /api/setting');


app.use((req,res,next)=>{ console.log(`[REQ] ${req.method} ${req.path}`); next(); });


// DB & 启动
mongoose.connect(process.env.MONGO_URI, { dbName: 'topteam' })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5001, () =>
      console.log(`Server running on ${process.env.PORT || 5001}`)
    );
  })
  .catch(err => {
    console.error('Mongo connect error:', err);
    process.exit(1);
  });