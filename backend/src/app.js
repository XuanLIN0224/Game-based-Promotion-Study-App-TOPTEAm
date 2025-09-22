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

const eventRoutes = require('./routes/events');
const teacherEventRoutes = require('./routes/teacherEvents');

const attachUser = require('./middleware/attachUser'); // 例子名字
app.use(attachUser); // 放在挂载任何受保护路由之前

app.use('/api/events', eventRoutes);
app.use('/api/teacher/events', teacherEventRoutes);

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

// 这两行如果上面没引入，就加上
const Event = require('./models/Event');
const User = require('./models/User');

// 每 5 分钟扫描“已结束但未结算”的 event
cron.schedule('*/* * * * *', async () => {
  try {
    const now = new Date();

    // 找出需要结算的活动：已结束且还没写 settledAt
    const toSettle = await Event.find({
      endAt: { $lt: now },
      settledAt: { $exists: false }
    }).limit(20);

    for (const ev of toSettle) {
      // 汇总当前两队 petfood（全量；如果要按时间窗口，就改成聚合增量日志）
      const agg = await User.aggregate([
        { $group: { _id: '$group', totalPetFood: { $sum: '$numPetFood' } } }
      ]);

      let cat = 0, dog = 0;
      for (const r of agg) {
        if (r._id === 'cat') cat = r.totalPetFood || 0;
        if (r._id === 'dog') dog = r.totalPetFood || 0;
      }

      const total = cat + dog;
      const pctCat = total ? Math.round((cat / total) * 1000) / 10 : 0; // 一位小数
      const pctDog = total ? Math.round((dog / total) * 1000) / 10 : 0;

      // 判定胜负
      let winner = 'draw';
      if (cat > dog) winner = 'cat';
      else if (dog > cat) winner = 'dog';

      // 给胜利队伍发放奖励（按每个 event 的 rewardScore，默认为 200）
      const reward = ev.rewardScore || 200;
      if (winner !== 'draw' && reward > 0) {
        await User.updateMany({ group: winner }, { $inc: { score: reward } });
      }

      // 冻结最终数据，写 winner/settledAt
      ev.final = { cat, dog, total, pctCat, pctDog };
      ev.winner = winner;
      ev.settledAt = new Date();
      await ev.save();

      console.log('[events] settled', ev._id.toString(), 'winner=', winner, 'reward=', reward);
    }
  } catch (e) {
    console.error('[events] settle error', e);
  }
});
