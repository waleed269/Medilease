// userRoutes.js — Exposes a list of users for owner selection
const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });

    if (users.length === 0) {
      const seedUsers = [
        { name: 'Dr. Ayesha Khan', email: 'ayesha.khan@medilease.local' },
        { name: 'Dr. Saad Malik', email: 'saad.malik@medilease.local' },
        { name: 'Nurse Fatima Ali', email: 'fatima.ali@medilease.local' },
        { name: 'Technician Omar Sheikh', email: 'omar.sheikh@medilease.local' },
      ];
      const created = await User.insertMany(seedUsers);
      return res.json({ success: true, data: created });
    }

    return res.json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
