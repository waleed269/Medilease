import React, { useState } from "react";
import { depositFunds } from "../services/walletService";

function DepositModal({ onClose, onSuccess }) {
  // ── Local State ──
  // amount: what the user types in the input
  const [amount, setAmount] = useState("");
  // loading: true while the API call is in progress (disables button)
  const [loading, setLoading] = useState(false);
  // error: error message to show below the form
  const [error, setError] = useState("");
  // success: success message to show after a successful deposit
  const [success, setSuccess] = useState("");

  // ── Handle Form Submission ──
  const handleDeposit = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");

    // Client-side validation before calling the API
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Deposit amount must be greater than 0.");
      return;
    }

    // Start loading
    setLoading(true);

    try {
      // Call the deposit API (defined in walletService.js)
      const data = await depositFunds(parsedAmount);

      if (data.success) {
        // Show success message briefly
        setSuccess(`✓ Deposited $${parsedAmount.toFixed(2)} successfully!`);

        // Wait 1.2 seconds, then close modal and update parent's wallet data
        setTimeout(() => {
          onSuccess(data.wallet); // Pass new wallet data up to parent
          onClose();              // Close the modal
        }, 1200);
      } else {
        setError(data.message || "Deposit failed. Please try again.");
      }
    } catch (err) {
      // Axios throws an error for non-2xx responses
      // err.response.data.message contains our backend error message
      const msg =
        err.response?.data?.message ||
        "Network error. Please check your connection.";
      setError(msg);
    } finally {
      // Always turn off loading, whether success or failure
      setLoading(false);
    }
  };

  // ── Handle Enter Key ──
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleDeposit();
    }
  };

  return (
    // Clicking the dark overlay (not the box) closes the modal
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents clicks inside the box from closing it */}
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <h2 className="modal-title" style={{ color: "var(--green)" }}>
          MediLease Wallet Top-Up
        </h2>
        <p className="modal-subtitle">
          Add funds to your MediLease wallet to pay lease installments or manage equipment payments.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success">
            <span>✓</span>
            {success}
          </div>
        )}

        {/* Amount Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="deposit-amount">
            Amount (USD)
          </label>
          <input
            id="deposit-amount"
            type="number"
            className="form-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            min="0.01"
            step="0.01"
            autoFocus
            disabled={loading || !!success}
          />
        </div>

        {/* Submit Button */}
        <button
          className="btn btn-submit"
          onClick={handleDeposit}
          disabled={loading || !!success}
          style={{ background: "var(--green)" }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Processing...
            </>
          ) : (
            "Confirm Deposit"
          )}
        </button>

        {/* Cancel Link */}
        <button className="modal-cancel" onClick={onClose} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DepositModal;