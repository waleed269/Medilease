const mongoose = require("mongoose");


const WalletSchema = new mongoose.Schema(
  {

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One wallet per user — enforced at DB level
    },


    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"], // DB-level guard
    },


    totalDeposits: {
      type: Number,
      default: 0,
      min: 0,
    },


    totalWithdrawals: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {

    timestamps: true,
  }
);

// Export the model so controllers can use it
module.exports = mongoose.model("Wallet", WalletSchema);