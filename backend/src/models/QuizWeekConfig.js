const mongoose = require('mongoose');

const QuizWeekConfigSchema = new mongoose.Schema({
  weekIndex: { type: Number, min: 1, max: 12, required: true, unique: true },
  title: { type: String, default: '' },
  notes: { type: String, default: '' },
  pdfName: { type: String },
  pdfText: { type: String },           // parsed PDF text (truncated)
  pdfUpdatedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('QuizWeekConfig', QuizWeekConfigSchema);