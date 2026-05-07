// ============================================================
// src/pages/WalletDashboard.js — Main Wallet Page
// ============================================================
// This is the main page component. It:
//   1. Fetches wallet data on load (useEffect)
//   2. Stores wallet info and transactions in state (useState)
//   3. Renders stat cards, action buttons, and transaction list
//   4. Shows/hides Deposit and Withdraw modals
//
// DATA FLOW:
//   WalletDashboard
//     ├── fetches data via walletService.js
//     ├── passes data down to TransactionList
//     ├── opens DepositModal / WithdrawModal on button click
//     └── DepositModal/WithdrawModal call onSuccess() → update state
// ============================================================

import React, { useState, useEffect } from "react";
import { getWalletSummary, getWallets } from "../services/walletService";
import DepositModal from "../components/DepositModal";
import WithdrawModal from "../components/WithdrawModal";
import TransferModal from "../components/TransferModal";
import TransactionList from "../components/TransactionList";
import "../styles/global.css";

function WalletDashboard() {
  // ── State ──

  // wallet: holds { balance, totalDeposits, totalWithdrawals }
  const [wallet, setWallet] = useState(null);

  // transactions: array of recent transaction objects
  const [transactions, setTransactions] = useState([]);

  // loading: true while the initial API call is in progress
  const [loading, setLoading] = useState(true);

  // error: holds an error message if the API call fails
  const [error, setError] = useState("");

  // showDeposit / showWithdraw / showTransfer: controls which modal is visible
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const [wallets, setWallets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Fetch Wallet Data on Mount ──
  // useEffect with [] runs ONCE when the component first renders.
  // This is how we load initial data (like componentDidMount in class components).
  useEffect(() => {
    fetchWalletData();
    fetchWalletList();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getWalletSummary();

      if (data.success) {
        // Update state with fresh data from the server
        setWallet(data.wallet);
        setTransactions(data.recentTransactions);
      } else {
        setError(data.message || "Failed to load wallet data.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Access denied. Please ensure the backend is running and try again.");
      } else {
        setError("Could not connect to the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletList = async (search = "") => {
    try {
      const data = await getWallets(search);
      if (data.success) {
        setWallets(data.wallets);
      }
    } catch (err) {
      console.error("Wallet list fetch failed", err);
    }
  };

  const onSearchChange = async (event) => {
    const nextValue = event.target.value;
    setSearchQuery(nextValue);
    await fetchWalletList(nextValue);
  };

  // ── Called after a successful deposit or withdrawal ──
  // Instead of re-fetching from the API, we use the wallet data
  // that came back in the deposit/withdraw response.
  // Then we refresh the full summary to get the updated transactions.
  const handleTransactionSuccess = async (updatedWallet) => {
    // Immediately update the balance cards with the response data
    setWallet(updatedWallet);
    // Re-fetch to get the updated transaction list and wallet directory
    await fetchWalletData();
    await fetchWalletList(searchQuery);
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="loading-spinner-large" />
          <p>Loading your wallet...</p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <h3>⚠ Error</h3>
          <p>{error}</p>
          <button className="refresh-btn" onClick={fetchWalletData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="page-wrapper">

      {/* ── Page Header ── */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          MediLease <span>Wallet</span>
        </h1>
        <span className="header-badge">● Demo</span>
      </div>

      {/* ── Stats Cards ── */}
      {wallet && (
        <div className="stats-grid">
          {/* Current Balance */}
          <div className="stat-card">
            <div className="stat-label">Current Balance</div>
            <div className="stat-value balance mono">
              ${wallet.balance.toFixed(2)}
            </div>
          </div>

          {/* Total Deposited */}
          <div className="stat-card">
            <div className="stat-label">Total Deposited</div>
            <div className="stat-value deposits mono">
              ${wallet.totalDeposits.toFixed(2)}
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="stat-card">
            <div className="stat-label">Total Withdrawn</div>
            <div className="stat-value withdrawals mono">
              ${wallet.totalWithdrawals.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="action-row">
        <button
          className="btn btn-deposit"
          onClick={() => setShowDeposit(true)}
        >
          ↓ Top Up Wallet
        </button>
        <button
          className="btn btn-withdraw"
          onClick={() => setShowWithdraw(true)}
        >
          ↑ Withdraw Payout
        </button>
        <button
          className="btn btn-transfer"
          onClick={() => setShowTransfer(true)}
        >
          ↔ Transfer
        </button>
      </div>

      {/* ── Transaction Ledger ── */}
      <TransactionList transactions={transactions} />

      {/* ── Wallet Directory with Search ── */}
      <div className="wallet-directory">
        <div className="directory-header">
          <div>
            <h3>Wallet Directory</h3>
            <p>Search and explore all MediLease wallets in the demo environment.</p>
          </div>
          <input
            type="search"
            className="search-input"
            placeholder="Search wallets by user ID"
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>

        {wallets.length === 0 ? (
          <div className="wallet-empty">
            <p>No wallets found.</p>
            <p>Try a different search term or add some wallet activity.</p>
          </div>
        ) : (
          <div className="wallet-list">
            {wallets.map((item) => (
              <div key={item.userId} className="wallet-card">
                <div>
                  <div className="wallet-id">Wallet ID</div>
                  <div className="wallet-value">{item.userId}</div>
                </div>
                <div className="wallet-values">
                  <div>
                    <div className="wallet-label">Balance</div>
                    <div className="wallet-amount">${item.balance.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="wallet-label">Deposited</div>
                    <div className="wallet-amount deposits">${item.totalDeposits.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="wallet-label">Withdrawn</div>
                    <div className="wallet-amount withdrawals">${item.totalWithdrawals.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals (rendered conditionally) ── */}
      {/* Deposit Modal */}
      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}

      {/* Withdraw Modal — passes current balance for client-side validation */}
      {showWithdraw && wallet && (
        <WithdrawModal
          currentBalance={wallet.balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}

      {showTransfer && wallet && (
        <TransferModal
          currentBalance={wallet.balance}
          onClose={() => setShowTransfer(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}
    </div>
  );
}

export default WalletDashboard;