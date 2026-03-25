const express = require("express");
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  paystackWebhook
} = require("../controllers/paymentController");
const { votingEnded } = require("../utils/votingFinalizer");

router.post("/initialize", (req, res, next) => {
  if (votingEnded()) {
    return res.status(403).json({
      success: false,
      message: "Voting has ended",
    });
  }
  next();
}, initializePayment);

// allow already-created payments to verify
router.get("/verify/:reference", verifyPayment);

// allow paystack to finish notifying your server
router.post("/webhook", express.raw({ type: "application/json" }), paystackWebhook);

module.exports = router;