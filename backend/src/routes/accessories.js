/**
 * This file includes APIs (routes) used for the realization of the "Customize" phase/feature.
 * Three functions:
 * F1: The user would like to see the accessories they are owning
 * F2: The user would like to buy/purchase a new accessory for their character
 * F3: The user would like to change the place/position of the accessory item on the character
 * F4: The user would like to remove/add back an already owned accessory from the character (picture)
 *
 */
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');

const AccessoryItem = require('../models/Accessories');

/**
 * Catalog (MVP hard-coded)
 * title: the corresponding accessory name rendered to the user
 * picture: the corresponding accessory figure rendered to the user
 * price：regard the user's score as the currency and reduce the total score of the user when performing purchase
 * types: they should all be the same type
 */
 const CATALOG = {
   bear_ear:             { title: 'BearEar',        imageUrl: '/customise/bear_ear.png',       price: 7,  limit: 1 },
   cat_ear:              { title: 'CatEar',         imageUrl: '/customise/cat_ear.png',        price: 5,  limit: 1 },
};
 // imageUrl: '/assets/hat.png',

/** F0: Return all catalogs for rendering */
router.get('/', auth, async (req, res) => {
  // Turn catalog object into a list
  const list = Object.entries(CATALOG).map(([key, meta]) => ({
    key,
    ...meta
  }));

  res.json(list);
});

/** F1: Return a list of the user’s current accessory items */
// GET /api/accessories/items
router.get('/items', auth, async (req, res) => {
  // s1: Get the requesting user's id
  const userId = req.user._id;

  // s2: Get the accessories owned by the requesting user from the database
  // s2.1.1: Fetch all accessory items (documents) in the database--collection
  // s2.1.2: Trim unnecessary fields, just get the fields we are interested--the itemName and its transformation
  // s2.1.3: Sort according to the 'zIndex'--decide which item's image shows on the top
  const items = await AccessoryItem.find({userId})
                .select('itemName transform equipped')
                .sort({'transform.zIndex': 1, _id: 1})
                .lean();

  // s2.2: Build a map for the collection
  const ownedMap = Object.fromEntries(
    items.map(p => [p.itemName, p.equipped ? p.transform : null])
  );
  // s3: Build a clean list for return for each catalog
  const list = Object.entries(CATALOG).map(([key, meta]) => {
    // Return back the transformation if the user is owning the current catalog (accessory item)
    const owned = ownedMap[key] ?? null;    // OR ??
    return { key, ...meta, owned };
  });

  res.json(list);
});

/** F2: Store a new accessory item (new document) to the data base */
// POST /api/accessories/purchase { itemName, transform }
router.post('/purchase', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName, transform } = req.body || {};
  // [Defensive Check]
  if (!itemName || !transform) {
    return res.status(400).json({ message: '[PURCHASE] Invalid itemName/transformation' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingBuy = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingBuy) return res.status(400).json({ message: '[PURCHASE] Unknown accessory item' });

  // Step2: Check whether the requesting-to-be-bought of the user item has already been owned by the user
  const accessoriesOwned = req.user.accessories || [];
  // S2C1: The item has already been owned by the user
  const alreadyOwned = accessoriesOwned.some(a => a.key === itemName);
  if (alreadyOwned) {
    return res.status(400).json({ message: 'You already has the accessory. Explore other interesting accessories!' });
  }
  // S2C2: The item is not yet owned by the user
  // Step3: Check whether the current (requesting-buying) user has enough money to buy the current item
  const price = Number(itemRequestingBuy.price);
  const userScore = Number(req.user.score) || 0;
  const hasEnough = userScore >= price;
  // S3C1: Not have enough money to buy the current accessory item
  if (!hasEnough) {
    return res.status(400).json({ message: 'Ops! Seems we are not there yet. Explore other interesting accessories and win more scores!' });
  }

  // S3C2: Have enough money to buy the current new (for the specific user) accessory item
  // Step4: Perform the buying process

  try {
    // S4s1: Create a new document for the current user and the new item (user, item) (Accessories schema)
    await AccessoryItem.create({ userId, itemName, transform });
    // S4s2: Update the (User schema)
    // S4s2.1: Add the new item name to the accessory array in the user schema
    accessoriesOwned.push({ key: itemName });
    req.user.accessories = accessoriesOwned;
    // S4s2.2: Reduce the price of the item (the score amount) from the total score of the user
    req.user.score = req.user.score - itemRequestingBuy.price

    await req.user.save();

    // Pass back the newly bought accessory item
    return res.status(201).json({ message: 'Purchase Successful!', score: req.user.score });
  } catch (err) {
    console.error('Purchase error:', err);
    return res.status(500).json({ message: 'Failed to complete purchase', error: err.message });
  }
});

// Basic: without transform
// POST /api/accessories/purchase/still { itemName }
router.post('/purchase/still', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName } = req.body || {};
  // [Defensive Check]
  if (!itemName) {
    return res.status(400).json({ message: '[PURCHASE] Invalid itemName' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingBuy = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingBuy) return res.status(400).json({ message: '[PURCHASE] Unknown accessory item' });

  // Step2: Check whether the requesting-to-be-bought of the user item has already been owned by the user
  const accessoriesOwned = req.user.accessories || [];
  // S2C1: The item has already been owned by the user
  const alreadyOwned = accessoriesOwned.some(a => a.key === itemName);
  if (alreadyOwned) {
    return res.status(400).json({ message: 'You already has the accessory. Explore other interesting accessories!' });
  }
  // S2C2: The item is not yet owned by the user
  // Step3: Check whether the current (requesting-buying) user has enough money to buy the current item
  const price = Number(itemRequestingBuy.price);
  const userScore = Number(req.user.score) || 0;
  const hasEnough = userScore >= price;
  // S3C1: Not have enough money to buy the current accessory item
  if (!hasEnough) {
    return res.status(400).json({ message: 'Ops! Seems we are not there yet. Explore other interesting accessories and win more scores!' });
  }

  // S3C2: Have enough money to buy the current new (for the specific user) accessory item
  // Step4: Perform the buying process

  try {
    // S4s1: Create a new document for the current user and the new item (user, item) (Accessories schema)
    await AccessoryItem.create({ userId, itemName, transform: {} });
    // S4s2: Update the (User schema)
    // S4s2.1: Add the new item name to the accessory array in the user schema
    accessoriesOwned.push({ key: itemName });
    req.user.accessories = accessoriesOwned;
    // S4s2.2: Reduce the price of the item (the score amount) from the total score of the user
    req.user.score = req.user.score - itemRequestingBuy.price

    await req.user.save();

    // Pass back the newly bought accessory item
    return res.status(201).json({ message: 'Purchase Successful!', score: req.user.score });
  } catch (err) {
    console.error('Purchase error:', err);
    return res.status(500).json({ message: 'Failed to complete purchase', error: err.message });
  }
});

/** F3: Update the new transform of an accessory item that is already owned by the user */
// PATCH /api/accessories/adjust { itemName, newTransform }
router.patch('/adjust', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName, newTransform } = req.body || {};
  // [Defensive Check]
  if (!itemName || !newTransform) {
    return res.status(400).json({ message: '[ADJUST] Invalid itemName/transformation' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingAdjust = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingAdjust) return res.status(400).json({ message: '[ADJUST] Unknown accessory item' });

  // Step2: Update the corresponding accessory item database document
  // S2s1: Fetch the corresponding accessory item document of the currently requesting unique (userId, item) pair
  const correspondItemDoc = await AccessoryItem.findOne({ userId, itemName });
  // Defensive Check
  if (!correspondItemDoc) {
    return res.status(404).json({ message: '[ADJUST] Accessory not found for this user--Fatal' });
  }
  // S2s2: Replace the old transform with the new one
  correspondItemDoc.transform = newTransform;

  await correspondItemDoc.save();

  // Return the newly adjusted item using the same format as in GET
  return res.json({ key: itemName,
                    title: itemRequestingAdjust.title,
                    price: itemRequestingAdjust.price,
                    imageUrl: itemRequestingAdjust.imageUrl,
                    limit: 1,
                    owned: correspondItemDoc.transform
  });
});


/** F4: Change this specific accessory of the user to 'unequipped'/'equipped'--disappear/reappear on the UI */
// PATCH /api/accessories/remove { itemName }
router.patch('/remove', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName } = req.body || {};
  // [Defensive Check]
  if (!itemName) {
    return res.status(400).json({ message: '[REMOVE] Invalid itemName' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingRemove = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingRemove) return res.status(400).json({ message: '[REMOVE] Unknown accessory item' });

  // Step2: Update the corresponding accessory item database document
  // S2s1: Fetch the corresponding accessory item document of the currently requesting unique (userId, item) pair
  const correspondItemDoc = await AccessoryItem.findOne({ userId, itemName });
  // Defensive Check
  if (!correspondItemDoc) {
    return res.status(404).json({ message: '[REMOVE] Accessory not found for this user--Fatal' });
  }
  // S2s2: Unequip the accessory--let it disappear on the UI
  correspondItemDoc.equipped = false;

  await correspondItemDoc.save();

  // Return the newly adjusted item using the same format as in GET
  return res.json({ key: itemName,
                    title: itemRequestingRemove.title,
                    price: itemRequestingRemove.price,
                    imageUrl: itemRequestingRemove.imageUrl,
                    limit: 1,
                    owned: correspondItemDoc.transform
  });
});

// PATCH /api/accessories/apply { itemName }
router.patch('/apply', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName } = req.body || {};
  // [Defensive Check]
  if (!itemName) {
    return res.status(400).json({ message: '[REMOVE] Invalid itemName' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingRemove = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingRemove) return res.status(400).json({ message: '[REMOVE] Unknown accessory item' });

  // Step2: Update the corresponding accessory item database document
  // S2s1: Fetch the corresponding accessory item document of the currently requesting unique (userId, item) pair
  const correspondItemDoc = await AccessoryItem.findOne({ userId, itemName });
  // Defensive Check
  if (!correspondItemDoc) {
    return res.status(404).json({ message: '[REMOVE] Accessory not found for this user--Fatal' });
  }
  // S2s2: Equip the accessor--let it reappear on the UI
  correspondItemDoc.equipped = true;

  await correspondItemDoc.save();

  // Return the newly adjusted item using the same format as in GET
  return res.json({ key: itemName,
                    title: itemRequestingRemove.title,
                    price: itemRequestingRemove.price,
                    imageUrl: itemRequestingRemove.imageUrl,
                    limit: 1,
                    owned: correspondItemDoc.transform
  });
});

// Combine to one
// PATCH /api/accessories/apply { itemName, equip }
router.patch('/equip', auth, async (req, res) => {
  // Step1: Preparation
  // Get the requesting user's id
  const userId = req.user._id;
  // Strip the request body to get the newly bought accessory item
  const { itemName, equip } = req.body || {};
  // [Defensive Check]
  if (!itemName) {
    return res.status(400).json({ message: '[REMOVE] Invalid itemName' });
  }

  // Get the corresponding catalog--the catalog property values
  const itemRequestingRemove = CATALOG[itemName];
  // [Defensive Check]
  if (!itemRequestingRemove) return res.status(400).json({ message: '[REMOVE] Unknown accessory item' });

  // Step2: Update the corresponding accessory item database document
  // S2s1: Fetch the corresponding accessory item document of the currently requesting unique (userId, item) pair
  const correspondItemDoc = await AccessoryItem.findOne({ userId, itemName });
  // Defensive Check
  if (!correspondItemDoc) {
    return res.status(404).json({ message: '[REMOVE] Accessory not found for this user--Fatal' });
  }
  // S2s2: Replace the old transform with the empty object--need to discuss
  correspondItemDoc.equipped = !!equip;

  await correspondItemDoc.save();

  // Return the newly adjusted item using the same format as in GET
  return res.json({ key: itemName,
                    title: itemRequestingRemove.title,
                    price: itemRequestingRemove.price,
                    imageUrl: itemRequestingRemove.imageUrl,
                    limit: 1,
                    owned: correspondItemDoc.transform
  });
});

module.exports = router;

