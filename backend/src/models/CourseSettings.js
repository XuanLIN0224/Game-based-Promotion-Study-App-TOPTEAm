const mongoose = require('mongoose');

const CourseSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },           // "course"
  startDate: { type: String, required: false }   // YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model('CourseSettings', CourseSettingsSchema);