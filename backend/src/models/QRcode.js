const mongoose = require('mongoose');

const QRCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., UUID
  type: { type: String, enum: ['attendance', 'event'], default: 'attendance' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },

  // Active window
  validFrom: { type: Date, required: true },  // start time
  validUntil: { type: Date, required: true }, // end time

  // Attendance
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // who scanned

  // Which session (1..24)
  sessionIndex: { type: Number, required: true, min: 1, max: 24 },
});

// Indexes
QRCodeSchema.index({ code: 1 }, { unique: true });
QRCodeSchema.index({ sessionIndex: 1, validFrom: 1 });

module.exports = mongoose.model('QRCode', QRCodeSchema);