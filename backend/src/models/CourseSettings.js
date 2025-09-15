const mongoose = require('mongoose');

const CourseSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },           // "course"
  startDate: { type: String, required: false },   // YYYY-MM-DD
  autoGenerate: { type: Boolean, default: false },
lastAutoGenDate: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('CourseSettings', CourseSettingsSchema);