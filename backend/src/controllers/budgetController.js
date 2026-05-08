// budgetController.js — Handles all budget-related API logic
// Creates and manages monthly budgets with automatic status calculation
// Status is ALWAYS calculated on the backend by reading actual expenses

const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// ─── Helper: Consistent response format ──────────────────────────────────────
const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

// ─── Helper: Validate MongoDB ObjectId ───────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────────────
// CORE LOGIC: recalculateBudgetStatus
// This is the most important function in this module
// It reads the user's actual expenses for a given month,
// sums them up, and determines the budget status
// ─────────────────────────────────────────────────────────────────────────────
const recalculateBudgetStatus = async (budget) => {
  // Parse the "YYYY-MM" month string into a date range
  const [year, mon] = budget.month.split('-').map(Number);
  const startOfMonth = new Date(year, mon - 1, 1); // e.g. May 1
  const startOfNextMonth = new Date(year, mon, 1);  // e.g. June 1

  // Aggregate all expenses for this user in this month
  const result = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(budget.userId),
        date: { $gte: startOfMonth, $lt: startOfNextMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  // If no expenses exist yet, spent is 0
  const spentAmount = result.length > 0 ? result[0].total : 0;

  // Calculate what percentage of the budget has been used
  const usagePercent = (spentAmount / budget.totalLimit) * 100;

  // Determine status based on thresholds
  let status = 'safe';
  if (spentAmount >= budget.totalLimit) {
    status = 'exceeded';
  } else if (usagePercent >= budget.warningThreshold) {
    status = 'nearLimit';
  }

  return { spentAmount, status };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/budgets
// Create a new monthly budget for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const createBudget = async (req, res) => {
  try {
    const { month, totalLimit, categoryLimits, warningThreshold } = req.body;

    // Required field check
    if (!month || !totalLimit) {
      return sendResponse(res, 400, false, 'Month and totalLimit are required');
    }

    // Validate month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(month)) {
      return sendResponse(res, 400, false, 'Month must be in YYYY-MM format (e.g. 2026-05)');
    }

    if (Number(totalLimit) <= 0) {
      return sendResponse(res, 400, false, 'Total limit must be greater than zero');
    }

    // Check if a budget for this month already exists
    const existing = await Budget.findOne({ userId: req.user._id, month });
    if (existing) {
      return sendResponse(res, 409, false, `A budget for ${month} already exists. Edit it instead.`);
    }

    // Validate each category limit if provided
    if (categoryLimits && Array.isArray(categoryLimits)) {
      for (const cl of categoryLimits) {
        if (!cl.category || !cl.limit || Number(cl.limit) <= 0) {
          return sendResponse(res, 400, false, 'Each category limit must have a category name and a limit > 0');
        }
      }
    }

    // Create the budget document
    const budget = await Budget.create({
      userId: req.user._id,
      month,
      totalLimit: Number(totalLimit),
      categoryLimits: categoryLimits || [],
      warningThreshold: warningThreshold ? Number(warningThreshold) : 80,
    });

    // Immediately calculate status based on any existing expenses for this month
    const { spentAmount, status } = await recalculateBudgetStatus(budget);
    budget.spentAmount = spentAmount;
    budget.status = status;
    await budget.save();

    return sendResponse(res, 201, true, 'Budget created successfully', budget);
  } catch (error) {
    // Handle the unique compound index violation (userId + month)
    if (error.code === 11000) {
      return sendResponse(res, 409, false, 'A budget for this month already exists');
    }
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/budgets
// Get all budgets for the logged-in user (refreshes status each time)
// ─────────────────────────────────────────────────────────────────────────────
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id }).sort({ month: -1 });

    // Recalculate and persist status for each budget before returning
    const refreshed = await Promise.all(
      budgets.map(async (b) => {
        const { spentAmount, status } = await recalculateBudgetStatus(b);
        b.spentAmount = spentAmount;
        b.status = status;
        await b.save();
        return b;
      })
    );

    return sendResponse(res, 200, true, 'Budgets fetched successfully', refreshed);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/budgets/current
// Get this month's budget with full category breakdown
// ─────────────────────────────────────────────────────────────────────────────
const getCurrentBudget = async (req, res) => {
  try {
    // Determine the current month in YYYY-MM format
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budget = await Budget.findOne({ userId: req.user._id, month });

    if (!budget) {
      return sendResponse(res, 404, false, 'No budget set for the current month');
    }

    // Refresh overall status
    const { spentAmount, status } = await recalculateBudgetStatus(budget);
    budget.spentAmount = spentAmount;
    budget.status = status;
    await budget.save();

    // Calculate per-category spending for this month
    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const startOfNextMonth = new Date(year, mon, 1);

    // Group expenses by category for this month
    const categorySpending = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
          date: { $gte: startOfMonth, $lt: startOfNextMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' },
        },
      },
    ]);

    // Map each category limit against actual spending
    const categoryStatus = budget.categoryLimits.map((cl) => {
      const found = categorySpending.find((cs) => cs._id === cl.category);
      const spent = found ? found.spent : 0;
      const usagePct = (spent / cl.limit) * 100;

      return {
        category: cl.category,
        limit: cl.limit,
        spent,
        usagePercent: Math.round(usagePct),
        status:
          spent >= cl.limit
            ? 'exceeded'
            : usagePct >= budget.warningThreshold
            ? 'nearLimit'
            : 'safe',
      };
    });

    // Return the budget with the category breakdown attached
    return sendResponse(res, 200, true, 'Current budget fetched', {
      ...budget.toObject(),
      categoryStatus,
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/budgets/:id
// Update a budget — only if it belongs to the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendResponse(res, 400, false, 'Invalid budget ID format');
    }

    const budget = await Budget.findById(id);

    if (!budget) {
      return sendResponse(res, 404, false, 'Budget not found');
    }

    // Ownership check
    if (budget.userId.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'Access denied — this budget does not belong to you');
    }

    const { totalLimit, categoryLimits, warningThreshold } = req.body;

    if (totalLimit !== undefined) {
      if (Number(totalLimit) <= 0) {
        return sendResponse(res, 400, false, 'Total limit must be greater than zero');
      }
      budget.totalLimit = Number(totalLimit);
    }

    if (categoryLimits !== undefined) budget.categoryLimits = categoryLimits;
    if (warningThreshold !== undefined) budget.warningThreshold = Number(warningThreshold);

    // Recalculate status after the update
    const { spentAmount, status } = await recalculateBudgetStatus(budget);
    budget.spentAmount = spentAmount;
    budget.status = status;

    await budget.save();

    return sendResponse(res, 200, true, 'Budget updated successfully', budget);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/budgets/:id
// Delete a budget — only if it belongs to the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendResponse(res, 400, false, 'Invalid budget ID format');
    }

    const budget = await Budget.findById(id);

    if (!budget) {
      return sendResponse(res, 404, false, 'Budget not found');
    }

    // Ownership check
    if (budget.userId.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'Access denied — this budget does not belong to you');
    }

    await Budget.findByIdAndDelete(id);

    return sendResponse(res, 200, true, 'Budget deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

module.exports = {
  createBudget,
  getBudgets,
  getCurrentBudget,
  updateBudget,
  deleteBudget,
};