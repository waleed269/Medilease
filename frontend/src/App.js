import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import WalletDashboard from "./pages/WalletDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Main wallet page */}
        <Route path="/wallet" element={<WalletDashboard />} />

        {/* Redirect root to /wallet */}
        <Route path="/" element={<Navigate to="/wallet" replace />} />

        {/* Catch-all for unknown routes */}
        <Route
          path="*"
          element={
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              color: "#f5f0e8",
              fontFamily: "DM Mono, monospace",
              background: "#0f1623"
            }}>
              404 — Page not found
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;