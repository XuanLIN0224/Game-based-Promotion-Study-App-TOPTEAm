/**
 * This file is a schema for a user.
 * It stores all the information of a specific user.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, maxlength: 50, trim: true },
  username: { type: String, required: true, maxlength: 50, trim: true },
  password: { type: String, required: true },   // Hash for the password safety
  group: { type: String, enum: ['dog', 'cat'], required: true },
  breed: { type: mongoose.Schema.Types.ObjectId, ref: 'Breed' },
  score: { type: Number, default: 0 },
  scannedCodes: { type: [String], default: [] },    // For scanning QR code to gain score
  numPetFood: { type: Number, default: 0 },
  clothingConfig: { type: Object, default: {} },

  // Not allowing multi-device logging-in
  activeToken: { type: String },
  tokenExpiresAt: { type: Date },

  // Audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // An array to keep track of the power-ups owning (has already been bought) by the user
  inventory: {
    type: [{ key: { type: String }, qty: { type: Number, default: 0 } }],
    default: []
  },

  // An array to keep track of the accessories owning by the user
  accessories: {
    type: [{ key: { type: String } }],
    default: []
  },
  //, qty: { type: Number, default: 0 }

  boosterExpiresAt: { type: Date }, // for quiz_booster_today
  isStudent: { type: Boolean, default: true },
},
  // Enable the auto-update for 'updatedAt' when a user's record is updated
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  this.updatedAt = new Date();
  if (!this.isModified('password')) return next();
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);