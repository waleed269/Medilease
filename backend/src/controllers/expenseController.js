// expenseController.js — Handles all expense-related API logic
// CRUD + monthly and category summaries
// Every function enforces ownership: users can only touch their own expenses

const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// ─── Helper: Send a consistent JSON response ─────────────────────────────────
// Using this helper keeps all responses in the same shape throughout the app
const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

// ─── Helper: Validate MongoDB ObjectId format ────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/expenses
// Create a new expense for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, date, notes } = req.body;

    // Basic required field check
    if (!title || !amount || !category || !date) {
      return sendResponse(res, 400, false, 'Title, amount, category, and date are required');
    }

    // Amount must be positive
    if (Number(amount) <= 0) {
      return sendResponse(res, 400, false, 'Amount must be greater than zero');
    }

    // Create the expense — userId comes from the JWT middleware (req.user._id)
    const expense = await Expense.create({
      userId: req.user._id,
      title: title.trim(),
      amount: Number(amount),
      category: category.trim(),
      paymentMethod: paymentMethod || 'Cash',
      date: new Date(date),
      notes: notes ? notes.trim() : '',
    });

    return sendResponse(res, 201, true, 'Expense created successfully', expense);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses
// Get all expenses for the logged-in user
// Supports optional query filters: ?category=Food&startDate=2026-05-01&endDate=2026-05-31
// ─────────────────────────────────────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, paymentMethod } = req.query;

    // Always filter by the logged-in user's ID
    const filter = { userId: req.user._id };

    // Apply optional filters if provided
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Sort newest first
    const expenses = await Expense.find(filter).sort({ date: -1 });

    return sendResponse(res, 200, true, 'Expenses fetched successfully', expenses);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/summary/monthly
// Returns total spending grouped by year-month for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const getMonthlySummary = async (req, res) => {
  try {
    // MongoDB aggregation pipeline:
    // 1. $match — only this user's expenses
    // 2. $group — group by year and month, sum amounts
    // 3. $sort  — newest month first
    const summary = await Expense.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    // Format into readable "YYYY-MM" strings
    const formatted = summary.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalSpent: item.totalSpent,
      count: item.count,
    }));

    return sendResponse(res, 200, true, 'Monthly summary fetched', formatted);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/summary/categories
// Returns total spending grouped by category
// Optional query: ?month=2026-05 to filter to a specific month
// ─────────────────────────────────────────────────────────────────────────────
const getCategorySummary = async (req, res) => {
  try {
    const { month } = req.query;

    const matchStage = { userId: new mongoose.Types.ObjectId(req.user._id) };

    // If a month is provided, restrict to that month only
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);     // first day of month
      const end = new Date(year, mon, 1);            // first day of next month
      matchStage.date = { $gte: start, $lt: end };
    }

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } }, // highest spending category first
    ]);

    const formatted = summary.map((item) => ({
      category: item._id,
      totalSpent: item.totalSpent,
      count: item.count,
    }));

    return sendResponse(res, 200, true, 'Category summary fetched', formatted);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/expenses/:id
// Update a specific expense — only if it belongs to the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that the ID is a valid MongoDB ObjectId before querying
    if (!isValidId(id)) {
      return sendResponse(res, 400, false, 'Invalid expense ID format');
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return sendResponse(res, 404, false, 'Expense not found');
    }

    // Ownership check — the expense's userId must match the logged-in user
    if (expense.userId.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'Access denied — this expense does not belong to you');
    }

    const { title, amount, category, paymentMethod, date, notes } = req.body;

    // If amount is being updated, make sure it's still positive
    if (amount !== undefined && Number(amount) <= 0) {
      return sendResponse(res, 400, false, 'Amount must be greater than zero');
    }

    // Build the update object — only include fields that were sent
    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (amount !== undefined) updateFields.amount = Number(amount);
    if (category !== undefined) updateFields.category = category.trim();
    if (paymentMethod !== undefined) updateFields.paymentMethod = paymentMethod;
    if (date !== undefined) updateFields.date = new Date(date);
    if (notes !== undefined) updateFields.notes = notes.trim();

    // { new: true } returns the updated document, not the old one
    // { runValidators: true } re-runs schema validation on the update
    const updated = await Expense.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    return sendResponse(res, 200, true, 'Expense updated successfully', updated);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/expenses/:id
// Delete a specific expense — only if it belongs to the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendResponse(res, 400, false, 'Invalid expense ID format');
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return sendResponse(res, 404, false, 'Expense not found');
    }

    // Ownership check
    if (expense.userId.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'Access denied — this expense does not belong to you');
    }

    await Expense.findByIdAndDelete(id);

    return sendResponse(res, 200, true, 'Expense deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getMonthlySummary,
  getCategorySummary,
  updateExpense,
  deleteExpense,
};