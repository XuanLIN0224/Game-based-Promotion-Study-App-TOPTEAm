/**
 * This file is a schema for the line item for the state of a daily quiz, related to the "Quiz" feature.
 */

const mongoose = require('mongoose');

const DailyUserQuizStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  date: { type: String, index: true, required: true },
  attemptsAllowed: { type: Number, default: 1 },
  attemptsUsed: { type: Number, default: 0 }
}, { timestamps: true });

DailyUserQuizStateSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyUserQuizState', DailyUserQuizStateSchema);