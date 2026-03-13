const express = require("express");
const router = express.Router();
const {
  getNomineesByCategory,
  createNominee,
  updateNominee,
  deleteNominee
} = require("../controllers/nomineeController");

router.get("/:categoryId", getNomineesByCategory);
router.post("/", createNominee);
router.put("/:id", updateNominee);
router.delete("/:id", deleteNominee);

module.exports = router;