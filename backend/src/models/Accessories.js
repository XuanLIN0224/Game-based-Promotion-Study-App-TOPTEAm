const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  itemKey: { type: String, required: true, index: true },
  qty: { type: Number, required: true },

  createdAt: { type: Date, default: Date.now }
});

// ensure one doc won’t accidentally duplicate counting if you upsert later (optional)
PurchaseSchema.index({ userId: 1, itemKey: 1, weekStartISO: 1, createdAt: 1 });

module.exports = mongoose.model('Purchase', PurchaseSchema);