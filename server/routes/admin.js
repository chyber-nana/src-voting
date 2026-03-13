const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

router.get('/queue', requireAdmin, adminController.getQueue);
router.get('/stats', requireAdmin, adminController.getStats);
router.post('/verify', requireAdmin, adminController.verifyVote);

module.exports = router;