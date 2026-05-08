const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "TRANSFER_IN", "TRANSFER_OUT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Transaction amount must be greater than 0"],
    },

    sourceWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: false,
    },

    targetWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: false,
    },

    equipment: {
      type: String,
      trim: true,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", TransactionSchema);