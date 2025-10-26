/**
 * This file includes APIs (routes) used for the realization of the "Breed" feature.
 *
 * Main Functions:
 * F1: Retrieve all available breeds, optionally filtered by group (e.g., dog or cat).
 * F2: Seed the database with initial breed data for both groups (one-time setup, removable after deployment).
 */

const express = require('express');
const router = express.Router();
const Breed = require('../models/Breed');

// GET /api/breeds?group=dog|cat
router.get('/', async (req, res) => {
  const { group } = req.query;
  const q = group ? { group } : {};
  const breeds = await Breed.find(q).sort({ group: 1, name: 1 });
  res.json(breeds);
});

// GET /api/breeds/seed--one-time seed--could be deleted once deployed
router.get('/seed', async (req, res) => {
  const seed = [
    { group: 'dog', name: 'Border collie' },
    { group: 'dog', name: 'Dachshund' },
    { group: 'dog', name: 'Samoyed' },
    { group: 'dog', name: 'Toy poodle' },
    { group: 'cat', name: 'Yellow cat' },
    { group: 'cat', name: 'Grey cat' },
    { group: 'cat', name: 'Black cat' },
    { group: 'cat', name: 'White cat' },
  ];
  for (const b of seed) {
    await Breed.updateOne(b, { $setOnInsert: b }, { upsert: true });
  }
  res.json({ message: 'breeds seeded' });
});

module.exports = router;