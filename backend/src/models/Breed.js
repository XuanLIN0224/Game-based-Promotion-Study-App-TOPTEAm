/**
 * This file is a schema for the line item for breed, related to the user's character's information.
 */

const mongoose = require('mongoose');

const BreedSchema = new mongoose.Schema({
  group: { type: String, enum: ['dog', 'cat'], required: true },
  name: { type: String, required: true, maxlength: 50 },
  imageUrl: { type: String },
});

module.exports = mongoose.model('Breed', BreedSchema);