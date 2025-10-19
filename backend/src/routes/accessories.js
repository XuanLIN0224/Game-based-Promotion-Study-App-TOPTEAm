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
   bear_ear:             { title: 'Bear Ear',        imageUrl: '/customise/bear_ear.png',       price: 7,  limit: 1 },
   cat_ear:              { title: 'Cat Ear',         imageUrl: '/customise/cat_ear.png',        price: 5,  limit: 1 },
   crown:              { title: 'Crown',         imageUrl: '/customise/cat_ear.png',        price: 100,  limit: 1 },
};
 // imageUrl: '/assets/hat.png',

/** F0: Return all catalogs for rendering */
router.get('/', auth, async (req, res) => {
  const list = Object.entries(CATALOG).map(([key, meta]) => ({
    key,
    ...meta,
  }));
  res.json(list);
});

/** F1: Return a list of the user’s current accessory items */
// GET /api/accessories/items
router.get('/items', auth, async (req, res) => {
  const userId = req.user._id;

  // s2: Get the accessories owned by the requesting user from the database
  // s2.1.1: Fetch all accessory items (documents) in the database--collection
  // s2.1.2: Trim unnecessary fields, just get the fields we are interested--the itemName and its transformation
  // s2.1.3: Sort according to the 'zIndex'--decide which item's image shows on the top
  const items = await AccessoryItem.find({userId})
                .select('itemName transform equipped')
                .sort({'transform.zIndex': 1, _id: 1})
                .lean();

  const ownedMap = Object.fromEntries(items.map((p) => [p.itemName, p]));
  const list = Object.entries(CATALOG).map(([key, meta]) => {
    // Return back the transformation if the user is owning the current catalog (accessory item)
    const owned = ownedMap[key] ?? null;    // OR ??
    return { key, ...meta, owned };
  });

  res.json(list);
});

/** F2: Store a new accessory item (new document) to the database */
// POST /api/accessories/purchase/still { itemName }
router.post('/purchase/still', auth, async (req, res) => {
  const userId = req.user._id;
  const { itemName } = req.body || {};

  if (!itemName) {
    return res.status(400).json({ message: '[PURCHASE] Invalid itemName' });
  }

  const itemRequestingBuy = CATALOG[itemName];
  if (!itemRequestingBuy)
    return res.status(400).json({ message: '[PURCHASE] Unknown accessory item' });

  const accessoriesOwned = req.user.accessories || [];
  const alreadyOwned = accessoriesOwned.some((a) => a.key === itemName);
  const alreadyExistsInDB = await AccessoryItem.exists({ userId, itemName });

  //  Prevent duplicates cleanly before attempting insert
  if (alreadyOwned || alreadyExistsInDB) {
    return res
      .status(400)
      .json({ message: 'You already own this accessory!' });
  }

  const price = Number(itemRequestingBuy.price);
  const userScore = Number(req.user.score) || 0;
  if (userScore < price) {
    return res.status(400).json({
      message:
        'Ops! Seems we are not there yet. Explore other interesting accessories and win more scores!',
    });
  }

  try {
    // S4s1: Create a new document for the current user and the new item (user, item) (Accessories schema)
    await AccessoryItem.create({ userId, itemName, transform: {} });
    // S4s2: Update the (User schema)
    // S4s2.1: Add the new item name to the accessory array in the user schema
    accessoriesOwned.push({ key: itemName });
    req.user.accessories = accessoriesOwned;
    req.user.score = userScore - price;
    await req.user.save();

    return res.status(201).json({
      message: 'Purchase Successful!',
      score: req.user.score,
      owned: true,
      equipped: false,
    });
  } catch (err) {
    if (err.code === 11000) {
      console.warn(
        'Duplicate accessory detected for user:',
        userId,
        itemName
      );
      return res
        .status(400)
        .json({ message: 'You already own this accessory!' });
    }

    console.error('Purchase error:', err);
    return res
      .status(500)
      .json({ message: 'Failed to complete purchase', error: err.message });
  }
});

/** F3: Update the new transform of an accessory item that is already owned by the user */
router.patch('/adjust', auth, async (req, res) => {
  const userId = req.user._id;
  const { itemName, newTransform } = req.body || {};
  if (!itemName || !newTransform) {
    return res
      .status(400)
      .json({ message: '[ADJUST] Invalid itemName/transformation' });
  }

  const itemRequestingAdjust = CATALOG[itemName];
  if (!itemRequestingAdjust)
    return res.status(400).json({ message: '[ADJUST] Unknown accessory item' });

  const correspondItemDoc = await AccessoryItem.findOne({ userId, itemName });
  if (!correspondItemDoc) {
    return res
      .status(404)
      .json({ message: '[ADJUST] Accessory not found for this user--Fatal' });
  }

  correspondItemDoc.transform = newTransform;
  await correspondItemDoc.save();

  return res.json({
    key: itemName,
    title: itemRequestingAdjust.title,
    price: itemRequestingAdjust.price,
    imageUrl: itemRequestingAdjust.imageUrl,
    limit: 1,
    owned: correspondItemDoc.transform,
  });
});

/** F4: Equip only one accessory at a time */
router.patch('/equip', auth, async (req, res) => {
  const userId = req.user._id;
  const { itemName, equip } = req.body || {};
  if (!itemName) {
    return res.status(400).json({ message: '[EQUIP] Invalid itemName' });
  }

  const itemMeta = CATALOG[itemName];
  if (!itemMeta)
    return res.status(400).json({ message: '[EQUIP] Unknown accessory item' });

  // Unequip all other accessories first
  await AccessoryItem.updateMany({ userId }, { equipped: false });

  // Equip the selected one (if equip=true)
  if (equip) {
    const itemDoc = await AccessoryItem.findOneAndUpdate(
      { userId, itemName },
      { equipped: true },
      { new: true }
    );
    return res.json({
      key: itemName,
      equipped: true,
      message: `Equipped ${itemMeta.title}`,
    });
  }

  // If unequipping current
  await AccessoryItem.updateOne({ userId, itemName }, { equipped: false });
  return res.json({ key: itemName, equipped: false, message: 'Accessory removed' });
});
module.exports = router;

