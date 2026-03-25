const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { votingEnded } = require("../utils/votingFinalizer");

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

function blockIfVotingEnded(req, res, next) {
  if (votingEnded()) {
    return res.status(403).json({
      success: false,
      message: "Voting has ended",
    });
  }
  next();
}

router.get("/queue", requireAdmin, adminController.getQueue);
router.get("/stats", requireAdmin, adminController.getStats);
router.post("/verify", requireAdmin, blockIfVotingEnded, adminController.verifyVote);

module.exports = router;