/**
 * This file is a schema for the line item for a quiz's file, related to the teacher's portal.
 * It enables the teacher to upload a file so as to generate a quiz (done by our AI), rather than directly using AI generated quiz (default in our system).
 */

const mongoose = require('mongoose');

const QuizWeekConfigSchema = new mongoose.Schema({
  weekIndex: { type: Number, min: 1, max: 12, required: true, unique: true },
  title: { type: String, default: '' },
  notes: { type: String, default: '' },
  pdfName: { type: String },
  pdfText: { type: String },    // parsed PDF text (truncated)
  pdfUpdatedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('QuizWeekConfig', QuizWeekConfigSchema);