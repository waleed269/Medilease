const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// MediLease demo mode uses a shared fallback wallet until full auth is integrated.
const DEFAULT_USER_ID = "000000000000000000000000";

const getOrCreateWallet = async (userId) => {
  // findOne looks for a wallet with this userId
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    // No wallet found → create one with default balance of 0
    wallet = await Wallet.create({ userId });
  }

  return wallet;
};

const listWallets = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const pipeline = [];

    if (search) {
      pipeline.push({
        $addFields: {
          userIdString: { $toString: "$userId" },
        },
      });
      pipeline.push({
        $match: {
          userIdString: { $regex: search, $options: "i" },
        },
      });
    }

    pipeline.push({
      $project: {
        userId: { $toString: "$userId" },
        balance: 1,
        totalDeposits: 1,
        totalWithdrawals: 1,
        createdAt: 1,
      },
    });

    pipeline.push({ $sort: { balance: -1 } });

    const wallets = await Wallet.aggregate(pipeline);

    return res.status(200).json({ success: true, wallets });
  } catch (error) {
    console.error("Wallet list error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch the wallet directory.",
    });
  }
};

const transfer = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const toUserId = req.body.toUserId?.trim();
    const fromUserId = req.user?.id || DEFAULT_USER_ID;

    const equipment = (req.body.equipment || "").trim();

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: "Please enter a receiver user ID.",
      });
    }

    if (!equipment) {
      return res.status(400).json({
        success: false,
        message: "Please specify the equipment or lease item for this transfer.",
      });
    }

    if (toUserId === fromUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot transfer to the same wallet.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({
        success: false,
        message: "Receiver user ID must be a valid 24-character ID.",
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Transfer amount must be a positive number.",
      });
    }

    const session = await Wallet.startSession();
    session.startTransaction();

    const fromWallet = await Wallet.findOneAndUpdate(
      {
        userId: fromUserId,
        balance: { $gte: amount },
      },
      {
        $inc: {
          balance: -amount,
          totalWithdrawals: amount,
        },
      },
      { new: true, session }
    );

    if (!fromWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Insufficient balance for transfer.",
      });
    }

    const toWallet = await Wallet.findOneAndUpdate(
      { userId: toUserId },
      {
        $inc: {
          balance: amount,
          totalDeposits: amount,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    );

    await Transaction.insertMany(
      [
        {
          walletId: fromWallet._id,
          type: "TRANSFER_OUT",
          amount,
          targetWalletId: toWallet._id,
          equipment,
        },
        {
          walletId: toWallet._id,
          type: "TRANSFER_IN",
          amount,
          sourceWalletId: fromWallet._id,
          equipment,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Transferred $${amount.toFixed(2)} for ${equipment} to wallet ${toUserId}.`,
      wallet: {
        balance: fromWallet.balance,
        totalDeposits: fromWallet.totalDeposits,
        totalWithdrawals: fromWallet.totalWithdrawals,
      },
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during transfer. Please try again.",
    });
  }
};

const deposit = async (req, res) => {
  try {
    
    const amount = parseFloat(req.body.amount);

    
    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be a number.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Deposit amount must be greater than 0.",
      });
    }

    const userId = req.user?.id || DEFAULT_USER_ID;
    let wallet = await getOrCreateWallet(userId);

    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId }, // Find wallet belonging to this user
      {
        $inc: {
          balance: amount,         
          totalDeposits: amount,   
        },
      },
      { new: true } 
    );

   
    await Transaction.create({
      walletId: updatedWallet._id,
      type: "DEPOSIT",
      amount: amount,
    });

  
    return res.status(200).json({
      success: true,
      message: `Successfully deposited $${amount.toFixed(2)}`,
      wallet: {
        balance: updatedWallet.balance,
        totalDeposits: updatedWallet.totalDeposits,
        totalWithdrawals: updatedWallet.totalWithdrawals,
      },
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during deposit. Please try again.",
    });
  }
};

const withdraw = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be a number.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal amount must be greater than 0.",
      });
    }

    const userId = req.user?.id || DEFAULT_USER_ID;
    let wallet = await getOrCreateWallet(userId);

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        userId,                          
        balance: { $gte: amount },       
      },
      {
        $inc: {
          balance: -amount,              
          totalWithdrawals: amount,      
        },
      },
      { new: true }
    );


    if (!updatedWallet) {
      const currentWallet = await Wallet.findOne({ userId });
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is $${
          currentWallet ? currentWallet.balance.toFixed(2) : "0.00"
        }.`,
      });
    }

    await Transaction.create({
      walletId: updatedWallet._id,
      type: "WITHDRAWAL",
      amount: amount,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully withdrew $${amount.toFixed(2)} from the MediLease wallet`,
      wallet: {
        balance: updatedWallet.balance,
        totalDeposits: updatedWallet.totalDeposits,
        totalWithdrawals: updatedWallet.totalWithdrawals,
      },
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during withdrawal. Please try again.",
    });
  }
};

const getSummary = async (req, res) => {
  try {
    const userId = req.user?.id || DEFAULT_USER_ID;

    const wallet = await getOrCreateWallet(userId);


    const recentTransactions = await Transaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalDeposits: wallet.totalDeposits,
        totalWithdrawals: wallet.totalWithdrawals,
        createdAt: wallet.createdAt,
      },
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        date: tx.createdAt,
        equipment: tx.equipment || "",
      })),
    });
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching wallet summary.",
    });
  }
};

module.exports = { deposit, withdraw, getSummary, listWallets, transfer };