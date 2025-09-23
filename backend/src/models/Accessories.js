const mongoose = require('mongoose');

/* A schema for the position of an accessory item--how an accessory item would be displayed on the UI */
const TransformSchema = new mongoose.Schema({
  // Positions of the item (Normalized coordinate values: store a percentage of the canvas width/height, instead of storing pixels (px))
  x: { type: Number, min: 0, max: 1, required: true, default: 0.5 },
  y: { type: Number, min: 0, max: 1, required: true, default: 0.5 },
  // Draw order of the item when rendering on the UI (the item is drawn at the front/back)
  // Higher index--on the top
  zIndex: { type: Number, default: 0 },
  // Degree of rotation (rotation angle) of the item when rendering on the UI--the accessories might not displayed strictly horizontally
  rotation: { type: Number, default: 0 },
  // Size multiplier of the item (zoom in or not the item's image)
  scale: { type: Number, min: 0.1, max: 5, default: 1 },
  // Anchor point for rotation and scaling (the spot around which the item spins/rotates or grows/shrinks)
  pivotX: { type: Number, min: 0, max: 1, default: 0.5 },
  pivotY: { type: Number, min: 0, max: 1, default: 0.5 }
},
  // Do not generate a unique id for every transformation schema
  { _id: false}
);


/* A schema for each accessory item--then keeps an array of the each item's quantity in the user schema */
const AccessoryItemSchema = new mongoose.Schema({
  // Each item has one unique id--the current item's unique id
  _id: { type: Schema.Types.ObjectId, auto: true },

  // Each item belongs to a specific user--the user that current item belongs to
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

  // The catalog of the current item
  itemName: { type: String, required: true, index: true },

  // The position (transformation) of the current item
  transform: { type: TransformSchema, default: () => ({}) },
  // Control whether render the item or not
  equipped: { type: Boolean, default: true },

  // Keep track of the current item created/updated dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
},
  // Enable the dates updated automatically
  { _id: true, timestamps: true }
);

// Ensure one doc won’t accidentally duplicate counting for later updates
// Ensure one user can only owns one accessory for a specific catalog--also shown in the catalog in the APIs file
AccessoryItemSchema.index({ userId: 1, itemName: 1}, { unique: true });



module.exports = mongoose.model('Purchase', PurchaseSchema);