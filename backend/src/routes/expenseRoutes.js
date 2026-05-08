// expenseRoutes.js — Defines all /api/expenses endpoints
// Every route is protected by the auth middleware

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createExpense,
  getExpenses,
  getMonthlySummary,
  getCategorySummary,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

// Apply auth middleware to ALL routes in this file
// This means every request must carry a valid JWT token
router.use(protect);

// Summary routes must come BEFORE /:id routes
// Otherwise Express would try to match "monthly" or "categories" as an :id
router.get('/summary/monthly', getMonthlySummary);
router.get('/summary/categories', getCategorySummary);

router.post('/', createExpense);
router.get('/', getExpenses);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;