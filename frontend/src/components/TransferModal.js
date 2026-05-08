import React, { useState } from "react";
import { transferFunds } from "../services/walletService";

function TransferModal({ currentBalance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [equipment, setEquipment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTransfer = async () => {
    setError("");
    setSuccess("");

    const parsedAmount = parseFloat(amount);

    if (!toUserId.trim()) {
      setError("Enter the recipient wallet ID.");
      return;
    }

    if (!equipment.trim()) {
      setError("Please specify the equipment for this payment.");
      return;
    }

    if (!amount || isNaN(parsedAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Transfer amount must be greater than 0.");
      return;
    }

    if (parsedAmount > currentBalance) {
      setError(`Cannot transfer more than $${currentBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    try {
      const data = await transferFunds(toUserId.trim(), parsedAmount, equipment.trim());
      if (data.success) {
        setSuccess(`✓ Sent $${parsedAmount.toFixed(2)} for ${equipment.trim()}!`);
        setTimeout(() => {
          onSuccess(data.wallet);
          onClose();
        }, 1200);
      } else {
        setError(data.message || "Transfer failed. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Network error. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleTransfer();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title" style={{ color: "var(--gold)" }}>
          Transfer to Another Wallet
        </h2>
        <p className="modal-subtitle">
          Send MediLease funds to a peer wallet using the recipient's wallet ID.
        </p>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>✓</span>
            {success}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="recipient-id">
            Recipient Wallet ID
          </label>
          <input
            id="recipient-id"
            type="text"
            className="form-input"
            placeholder="e.g. 645f1c2a3e4f8a1b2c3d4e5f"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            autoFocus
            disabled={loading || !!success}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="equipment-name">
            Equipment / Lease Item
          </label>
          <input
            id="equipment-name"
            type="text"
            className="form-input"
            placeholder="Portable ultrasound machine"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !!success}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="transfer-amount">
            Amount (USD)
          </label>
          <input
            id="transfer-amount"
            type="number"
            className="form-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            min="0.01"
            step="0.01"
            disabled={loading || !!success}
          />
        </div>

        <button
          className="btn btn-submit"
          onClick={handleTransfer}
          disabled={loading || !!success}
          style={{ background: "var(--gold)", color: "var(--navy)" }}
        >
          {loading ? (
            <>
              <span className="spinner" /> Sending...
            </>
          ) : (
            "Confirm Transfer"
          )}
        </button>

        <button className="modal-cancel" onClick={onClose} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TransferModal;
