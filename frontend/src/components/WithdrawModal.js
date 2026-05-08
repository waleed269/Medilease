import React, { useState } from "react";
import { withdrawFunds } from "../services/walletService";

function WithdrawModal({ currentBalance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");

    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Withdrawal amount must be greater than 0.");
      return;
    }

    if (parsedAmount > currentBalance) {
      setError(
        `Insufficient balance. You can withdraw up to $${currentBalance.toFixed(2)}.`
      );
      return;
    }

    setLoading(true);

    try {
      const data = await withdrawFunds(parsedAmount);

      if (data.success) {
        setSuccess(`✓ Withdrew $${parsedAmount.toFixed(2)} successfully!`);

        setTimeout(() => {
          onSuccess(data.wallet);
          onClose();
        }, 1200);
      } else {
        setError(data.message || "Withdrawal failed.");
      }
    } catch (err) {
      // The backend sends clear error messages (e.g., "Insufficient balance")
      // We surface them directly to the user here
      const msg =
        err.response?.data?.message ||
        "Network error. Please check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleWithdraw();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <h2 className="modal-title" style={{ color: "var(--red)" }}>
          Withdraw Payout
        </h2>
        <p className="modal-subtitle">
          Withdraw available wallet funds from your MediLease account.
          <br />
          Available balance:{" "}
          <strong style={{ color: "var(--gold)", fontFamily: "DM Mono, monospace" }}>
            ${currentBalance.toFixed(2)}
          </strong>
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
          <label className="form-label" htmlFor="withdraw-amount">
            Amount (USD)
          </label>
          <input
            id="withdraw-amount"
            type="number"
            className="form-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            min="0.01"
            max={currentBalance}
            step="0.01"
            autoFocus
            disabled={loading || !!success}
          />
        </div>

        {/* Quick-select percentage buttons for convenience */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[25, 50, 100].map((pct) => {
            const quickAmount = ((currentBalance * pct) / 100).toFixed(2);
            return (
              <button
                key={pct}
                onClick={() => setAmount(quickAmount)}
                disabled={loading || currentBalance === 0}
                style={{
                  flex: 1,
                  padding: "6px",
                  background: "var(--navy)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--white-dim)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "DM Mono, monospace",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => e.target.style.borderColor = "var(--gold)"}
                onMouseLeave={(e) => e.target.style.borderColor = "var(--border)"}
              >
                {pct}%
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          className="btn btn-submit"
          onClick={handleWithdraw}
          disabled={loading || !!success || currentBalance <= 0}
          style={{
            background: "var(--red)",
            color: "#fff",
          }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Processing...
            </>
          ) : (
            "Confirm Withdrawal"
          )}
        </button>

        <button className="modal-cancel" onClick={onClose} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default WithdrawModal;