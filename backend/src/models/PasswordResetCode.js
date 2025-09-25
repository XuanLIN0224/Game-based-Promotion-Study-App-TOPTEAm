/**
 * This file is a schema for the line item for the verification code, related with "resetPassword" function.
 */

const mongoose = require('mongoose');

const PasswordResetCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true }, // 6-bits
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, { timestamps: true });

PasswordResetCodeSchema.index({ email: 1, code: 1 });

module.exports = mongoose.model('PasswordResetCode', PasswordResetCodeSchema);