// Expense.js — Mongoose schema and model for individual expense records
// Each expense belongs to one user (userId) and has a category, amount, date, etc.

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    // Reference to the User who owns this expense
    // This is how we enforce ownership — we always filter by userId
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    // Short description of what the expense was for
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true, // removes leading/trailing whitespace
    },

    // Must be a positive number — validated here and in the controller
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },

    // Category name — e.g. Food, Transport, Health
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },

    // How the expense was paid
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Wallet', 'Card', 'Bank Transfer', 'Other'],
      default: 'Cash',
    },

    // The actual date the expense occurred (not when it was recorded)
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    // Equipment owner selected from the list of users
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Equipment owner is required'],
    },

    // Optional extra info about the expense
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model('Expense', expenseSchema);