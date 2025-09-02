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
app.set('trust proxy', 1); // behind Render/Proxy, needed for accurate req.ip in rate-limit
app.use(helmet());
app.use(express.json());
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://xuanlin0224.github.io'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, // 如需携带 cookie 时使用；纯 Bearer 也可保留
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const teacherRoutes = require('./routes/teacher');
const quizRoutes = require('./routes/quiz');
app.use('/api/teacher', teacherRoutes);
app.use('/api/quiz', quizRoutes);

// 安全限流（对认证与邮件相关接口）
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  skip: (req) => req.method === 'OPTIONS',
});
app.use(['/api/auth', '/api/user', '/api/game'], authLimiter);

// 路由
const authRoutes = require('./routes/auth');
const breedRoutes = require('./routes/breeds');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/game');
const inventoryRoutes = require('./routes/inventory');
const shopRoutes = require('./routes/shop');
const settingRoutes = require('./routes/setting');
const rankRoutes = require('./routes/rank')

app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/setting', settingRoutes);
app.get('/', (req, res) => res.send('TOPTEAM API OK'));
app.use('/api/auth', authRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rank', rankRoutes);

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

  // daily auto generation of DailyQuiz
const CourseSettings = require('./models/CourseSettings');
const QuizWeekConfig = require('./models/QuizWeekConfig');
const DailyQuiz = require('./models/DailyQuiz');
const { generateQuizFromContext } = require('./utils/genai');
const cron = require('node-cron');

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function weekIndexForDate(startDateStr, dateStr) {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr + 'T00:00:00');
  const cur = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor((cur - start) / 86400000);
  const idx = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(idx, 1), 12);
}

// Run at 00:05 local time
cron.schedule('5 0 * * *', async () => {
  try {
    const date = isoDate();
    const settings = await CourseSettings.findOne({ key: 'course' });
    if (!settings?.startDate) return;

    const weekIndex = weekIndexForDate(settings.startDate, date);
    const cfg = await QuizWeekConfig.findOne({ weekIndex });
    if (!cfg?.pdfText) return;

    const gen = await generateQuizFromContext({ pdfText: cfg.pdfText, notes: cfg.notes, title: cfg.title, numQuestions: 5 });
    await DailyQuiz.findOneAndUpdate(
      { date },
      { $set: { date, weekIndex, questions: gen.questions, generatedAt: new Date() } },
      { new: true, upsert: true }
    );
    console.log('[cron] generated quiz for', date, 'week', weekIndex);
  } catch (e) {
    console.error('[cron] generation error', e);
  }
});