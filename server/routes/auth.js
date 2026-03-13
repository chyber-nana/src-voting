const express = require('express');
const path = require('path');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.admin = true;
    return res.json({ success: true, redirect: '/admin' });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

router.get('/check', (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

module.exports = router;