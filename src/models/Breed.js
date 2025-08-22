const mongoose = require('mongoose');

const BreedSchema = new mongoose.Schema({
  group: { type: String, enum: ['dog', 'cat'], required: true },
  name: { type: String, required: true, maxlength: 50 },
  imageUrl: { type: String },
});

module.exports = mongoose.model('Breed', BreedSchema);