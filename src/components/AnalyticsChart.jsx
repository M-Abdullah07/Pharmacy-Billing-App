// src/components/AnalyticsChart.jsx
import React from "react";
import "../styles/AnalyticsChart.css";

export default function AnalyticsChart() {
  return (
    <div className="analytics-chart">
      <h3>Analytics</h3>
      <div className="chart-placeholder">
        {/* Replace with chart lib later */}
        <p>[Chart Goes Here]</p>
      </div>
      <div className="chart-footer">
        <button>Total Sell</button>
        <button>Drugs</button>
      </div>
    </div>
  );
}
