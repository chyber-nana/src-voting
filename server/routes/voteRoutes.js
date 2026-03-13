const express = require("express");
const router = express.Router();
const { submitVote } = require("../controllers/voteController");

router.post('/', submitVote);

module.exports = router;