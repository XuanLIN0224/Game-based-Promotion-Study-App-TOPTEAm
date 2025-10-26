/**
 * This file is a schema for the line item for course setting.
 */

const mongoose = require('mongoose');

const CourseSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  startDate: { type: String, required: false },
  autoGenerate: { type: Boolean, default: false },
  lastAutoGenDate: { type: String, default: null },
  breakWeek: { type: Number, min: 1, max: 12, default: null },
  }, { timestamps: true });

module.exports = mongoose.model('CourseSettings', CourseSettingsSchema);