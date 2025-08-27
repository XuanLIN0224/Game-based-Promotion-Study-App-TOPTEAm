const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, maxlength: 50, trim: true },
  username: { type: String, required: true, maxlength: 50, trim: true },
  password: { type: String, required: true }, // 存哈希
  group: { type: String, enum: ['dog', 'cat'], required: true },
  breed: { type: mongoose.Schema.Types.ObjectId, ref: 'Breed' }, // Step2 绑定
  score: { type: Number, default: 0 },
  numPetFood: { type: Number, default: 0 },
  clothingConfig: { type: Object, default: {} },

  // 单会话可选（阻止多设备同时登录）
  activeToken: { type: String },

  // 可选：审计
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  inventory: {
    type: [{ key: { type: String }, qty: { type: Number, default: 0 } }],
    default: []
  },
  boosterExpiresAt: { type: Date }, // for quiz_booster_today
});

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