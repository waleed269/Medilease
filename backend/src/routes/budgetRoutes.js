// budgetRoutes.js — Defines all /api/budgets endpoints

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createBudget,
  getBudgets,
  getCurrentBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');

router.use(protect);

// /current must be defined before /:id — same reason as expense routes
router.get('/current', getCurrentBudget);

router.post('/', createBudget);
router.get('/', getBudgets);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;