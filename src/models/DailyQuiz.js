const mongoose = require('mongoose');

const DailyQuizSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  weekIndex: { type: Number, min: 1, max: 12, required: true },
  questions: [{
    stem: { type: String, required: true },
    choices: [{ type: String, required: true }],
    answerIndex: { type: Number, required: true }
  }],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DailyQuiz', DailyQuizSchema);