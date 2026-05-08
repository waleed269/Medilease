// authRoutes.js — Simple development auth helpers for local testing
// This route does not verify users against a database; it only issues JWTs.

const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const createToken = (userId) =>
  jwt.sign({ _id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

router.post('/login', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId is required to generate a test token',
    });
  }

  const token = createToken(userId);
  return res.json({ success: true, token, userId });
});

router.get('/dev-token', (req, res) => {
  const userId = process.env.DEV_USER_ID || '000000000000000000000000';
  const token = createToken(userId);
  return res.json({ success: true, token, userId });
});

module.exports = router;
