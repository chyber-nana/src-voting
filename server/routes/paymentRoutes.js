const express = require("express");
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  paystackWebhook
} = require("../controllers/paymentController");

router.post("/initialize", initializePayment);
router.get("/verify/:reference", verifyPayment);
router.post("/webhook", express.raw({ type: "application/json" }), paystackWebhook);

module.exports = router;