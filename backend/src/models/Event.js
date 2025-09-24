/**
 * This file is a schema for the line item for an event, related to the teach's portal.
 * It allows teacher to modify the related event information (e.g., hint)
 */

const mongoose = require('mongoose');

/** A sub-schema for the hint for an event */
const HintSchema = new mongoose.Schema({
  threshold: { type: Number, required: true }, // e.g. 100, 200, 400
  title: { type: String, default: '' }, // e.g. "Hint 1"
  content: { type: String, default: '' },   // teacher-editable content
}, { _id: false });

/** A main schema for each event */
const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },

  // Default thresholds 100/200/400; teacher can edit
  hints: {
    type: [HintSchema],
    default: [
      { threshold: 100, title: 'Hint 1', content: '' },
      { threshold: 200, title: 'Hint 2', content: '' },
      { threshold: 400, title: 'Hint 3', content: '' },
    ]
  },
    // Each event has its own reward score
    rewardScore: { type: Number, default: 200 },

    // Mark the event is settled
    final: {
    cat:   { type: Number, default: 0 },
    dog:   { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    pctCat:{ type: Number, default: 0 },
    pctDog:{ type: Number, default: 0 },
    },

  // Bookkeeping
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  winner: { type: String, enum: ['cat', 'dog', 'draw', null], default: null },
  settledAt: { type: Date }, // when rewards were granted
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);