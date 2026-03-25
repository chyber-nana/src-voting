const express = require("express");
const router = express.Router();
const { submitVote } = require("../controllers/voteController");
const { votingEnded } = require("../utils/votingFinalizer");

router.post("/", (req, res, next) => {
  if (votingEnded()) {
    return res.status(403).json({
      success: false,
      message: "Voting has ended",
    });
  }
  next();
}, submitVote);

module.exports = router;