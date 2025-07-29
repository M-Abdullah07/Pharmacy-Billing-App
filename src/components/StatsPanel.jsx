// src/components/StatsPanel.jsx
import React from "react";
import "../styles/StatsPanel.css";

export default function StatsPanel() {
  return (
    <div className="stats-panel">
      <div className="stat-card">
        <h3>Total Profit</h3>
        <p>$19,679</p>
        <span className="positive">+17% /month</span>
      </div>
      <div className="stat-card">
        <h3>Total Sale</h3>
        <p>$87,857</p>
        <span className="positive">+12% /month</span>
      </div>
      <div className="stat-card">
        <h3>Out of Stock</h3>
        <p>679</p>
        <span className="neutral">+19% /month</span>
      </div>
      <div className="stat-card">
        <h3>Expired</h3>
        <p>67</p>
        <span className="negative">-12% /month</span>
      </div>
    </div>
  );
}