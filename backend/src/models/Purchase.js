/**
 * This file is a schema for the line item for items in shop, related with the "Shop" feature.
 */

const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  itemKey: { type: String, required: true, index: true },
  qty: { type: Number, required: true },
  weekStartISO: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure one doc won’t accidentally duplicate counting for later updates
PurchaseSchema.index({ userId: 1, itemKey: 1, weekStartISO: 1, createdAt: 1 });

module.exports = mongoose.model('Purchase', PurchaseSchema);