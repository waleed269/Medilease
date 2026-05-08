// Budget.js — Mongoose schema and model for monthly budgets
// Each budget covers one month and can have an overall limit
// plus optional per-category limits

const mongoose = require('mongoose');

// Sub-schema for each category limit inside a budget
// e.g. { category: "Food", limit: 5000 }
const categoryLimitSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    limit: {
      type: Number,
      required: true,
      min: [0.01, 'Category limit must be greater than zero'],
    },
  },
  { _id: false } // no separate _id for each category limit object
);

const budgetSchema = new mongoose.Schema(
  {
    // Reference to the User who owns this budget
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    // Month this budget applies to — stored as "YYYY-MM" string e.g. "2026-05"
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [
        /^\d{4}-(0[1-9]|1[0-2])$/,
        'Month must be in YYYY-MM format (e.g. 2026-05)',
      ],
    },

    // The maximum total amount the user wants to spend this month
    totalLimit: {
      type: Number,
      required: [true, 'Total limit is required'],
      min: [0.01, 'Total limit must be greater than zero'],
    },

    // Array of per-category limits — optional
    categoryLimits: [categoryLimitSchema],

    // Calculated field — how much the user has actually spent this month
    // This is recalculated from the Expense collection every time it's needed
    spentAmount: {
      type: Number,
      default: 0,
    },

    // Automatically determined status based on spentAmount vs totalLimit
    // 'safe'       → spent < warningThreshold% of totalLimit
    // 'nearLimit'  → spent >= warningThreshold% but < totalLimit
    // 'exceeded'   → spent >= totalLimit
    status: {
      type: String,
      enum: ['safe', 'nearLimit', 'exceeded'],
      default: 'safe',
    },

    // The percentage at which we start warning the user (default 80%)
    warningThreshold: {
      type: Number,
      default: 80,
      min: 1,
      max: 99,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one budget per user per month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);