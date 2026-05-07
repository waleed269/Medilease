import React from "react";

const formatDate = (dateString) => {
  const date = new Date(dateString);

  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${datePart} · ${timePart}`;
};

function TransactionList({ transactions }) {
  return (
    <div className="ledger-section">
      {/* Ledger Header */}
      <div className="ledger-header">
        <h3 className="ledger-title">MediLease Ledger</h3>
        <span className="ledger-subtitle">Recent wallet activity</span>
      </div>

      {/* Empty State */}
      {transactions.length === 0 ? (
        <div className="ledger-empty">
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
          <p>No wallet activity yet.</p>
          <p style={{ marginTop: "4px", fontSize: "0.8rem" }}>
            Top up your MediLease wallet to begin leasing equipment.
          </p>
        </div>
      ) : (
        /* Transaction Rows */
        transactions.map((tx) => {
          const isDeposit = tx.type === "DEPOSIT" || tx.type === "TRANSFER_IN";
          const isTransfer = tx.type === "TRANSFER_IN" || tx.type === "TRANSFER_OUT";
          const label = tx.type
            .split("_")
            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
            .join(" ");

          return (
            <div key={tx.id} className="transaction-row">
              {/* Left: icon + type + date */}
              <div className="tx-left">
                {/* Icon changes based on type */}
                <div
                  className={`tx-icon ${
                    isDeposit ? "deposit" : "withdrawal"
                  }`}
                >
                  {tx.type === "DEPOSIT" || tx.type === "TRANSFER_IN" ? "↓" : "↑"}
                </div>

                <div>
                  <div className="tx-type">{label}</div>
                  <div className="tx-date">{formatDate(tx.date)}</div>
                  {tx.equipment && (
                    <div className="tx-equipment">For: {tx.equipment}</div>
                  )}
                </div>
              </div>

              {/* Right: amount (green for deposits/transfer in, red for withdrawals/transfer out) */}
              <div
                className={`tx-amount ${
                  isDeposit ? "deposit" : "withdrawal"
                }`}
              >
                {isDeposit ? "+" : "−"}$
                {parseFloat(tx.amount).toFixed(2)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default TransactionList;