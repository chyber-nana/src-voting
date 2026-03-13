const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USER) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const match = await bcrypt.compare(password, process.env.ADMIN_HASH);

  if (!match) {
    return res.status(401).json({ error: "Invalid login" });
  }

  req.session.admin = true;
  res.json({ success: true });
});


module.exports = router;