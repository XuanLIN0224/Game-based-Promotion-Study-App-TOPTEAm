/**
 * This file implements the entrypoint of the backend server.
 * It wires middleware, mounts all APIs, connects to the MongoDB, and starts the HTTP server.
 * It also runs two cron jobs:
 * 1. Auto-generation of daily quiz
 * 2. Settle finished events and award points
 */

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');


/** Part1: Bootstrap and Security */
dotenv.config();

// For connection
// const dns = require('dns');
// dns.setServers(['8.8.8.8', '1.1.1.1']);    // Enforce using the stable DNS
// require('dns').setDefaultResultOrder('ipv4first');

// Create the application
const app = express();
// Set the proxy to client so client IPs work correctly behind it
app.set('trust proxy', 1); // behind Render/Proxy, needed for accurate req.ip in rate-limit
// Install security headers
app.use(helmet());
// Install JSON bode parsing--for input and output
app.use(express.json());
// Configure CORS--limit which frontend origins can call this backend (server)
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://xuanlin0224.github.io'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, // Used when needing to carry cookies
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const teacherRoutes = require('./routes/teacher');
const quizRoutes = require('./routes/quiz');
app.use('/api/teacher', teacherRoutes);
app.use('/api/quiz', quizRoutes);

// Set up a rate limiter
const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 20,  // Allow at most 20 requests per IP per minute
  skip: (req) => req.method === 'OPTIONS',
});
// Protect sensitive routes from abuse/brute force
app.use(['/api/auth', '/api/user', '/api/game'], authLimiter);


/** Part2: Routes and Middleware */
const authRoutes = require('./routes/auth');
const breedRoutes = require('./routes/breeds');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/game');
const inventoryRoutes = require('./routes/inventory');
const shopRoutes = require('./routes/shop');
const settingRoutes = require('./routes/setting');
const accessoriesRoutes = require('./routes/accessories');
const rankRoutes = require('./routes/rank')

const eventRoutes = require('./routes/events');
const teacherEventRoutes = require('./routes/teacherEvents');

const attachUser = require('./middleware/attachUser');  // Sample name
app.use(attachUser);    // Should be put in front of any protected routes

app.use('/api/events', eventRoutes);
app.use('/api/teacher/events', teacherEventRoutes);

app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/setting', settingRoutes);
app.use('/api/accessories', accessoriesRoutes);
app.get('/', (req, res) => res.send('TOPTEAM API OK'));
app.use('/api/auth', authRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rank', rankRoutes);

console.log('[BOOT] app mounting /api/setting');


app.use((req,res,next)=>{ console.log(`[REQ] ${req.method} ${req.path}`); next(); });


/** Part3: Start the Database and Backend Server */
mongoose.connect(process.env.MONGO_URI, { dbName: 'topteam' })
  .then(() => {
    console.log('MongoDB connected');
    // Start the server on port 5001
    app.listen(process.env.PORT || 5001, () =>
      console.log(`Server running on ${process.env.PORT || 5001}`)
    );
  })
  .catch(err => {
    console.error('Mongo connect error:', err);
    process.exit(1);
  });


/** Part4: Two Cron jobs */
// Job1: Weekly (Monday) Quiz auto generation
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

// Run at 00:05 local time every Monday
cron.schedule('5 0 * * 1', async () => {
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

// Job2: Event settlement
const Event = require('./models/Event');
const User = require('./models/User');

// This job will wake up and scan the evens that are "finished but not settled"
// '*/5 * * * *'
cron.schedule('*/* * * * *', async () => {
  try {
    const now = new Date();

    // Find out the events from the database which have finished but not yet settles-- looking at "settledAt"
    const toSettle = await Event.find({
      endAt: { $lt: now },
      settledAt: { $exists: false }
    }).limit(20);

    for (const ev of toSettle) {
      // Aggregate total pet food for each team
      const agg = await User.aggregate([
        { $group: { _id: '$group', totalPetFood: { $sum: '$numPetFood' } } }
      ]);
      // Extract the values for each team--cat vs dog
      let cat = 0, dog = 0;
      for (const r of agg) {
        if (r._id === 'cat') cat = r.totalPetFood || 0;
        if (r._id === 'dog') dog = r.totalPetFood || 0;
      }

      // Compute totals and percentages
      const total = cat + dog;
      const pctCat = total ? Math.round((cat / total) * 1000) / 10 : 0;
      const pctDog = total ? Math.round((dog / total) * 1000) / 10 : 0;

      // Divide the winner
      let winner = 'draw';
      if (cat > dog) winner = 'cat';
      else if (dog > cat) winner = 'dog';

      // Reward the winning team (each event has a "rewardScore", default score: 200 if missing)
      const reward = ev.rewardScore || 200;
      if (winner !== 'draw' && reward > 0) {
        await User.updateMany({ group: winner }, { $inc: { score: reward } });
      }

      // Freeze the final results into winner/settledAt
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
