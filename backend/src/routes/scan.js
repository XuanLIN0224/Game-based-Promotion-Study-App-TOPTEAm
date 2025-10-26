/**
 * This file includes APIs (routes) used for the realization of the "QR Scanning & Reward" feature.
 *
 * Main Functions:
 * F1: Process QR code scans by validating the provided code, rewarding the user with additional score points (+2), saving the updated score, and returning the new total.
 */

const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// POST /api/user/scan
router.post("/scan", auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "No QR code data" });

  // Expect format "reward:QR-#" from your generator
  if (!code.startsWith("reward:")) {
    return res.status(400).json({ message: "Invalid QR format" });
  }

  req.user.score += 2;
  await req.user.save();

  res.json({
    message: "QR scanned, +2 score",
    score: req.user.score,
  });
});

module.exports = router;
