// backend/src/routes/user.js
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
