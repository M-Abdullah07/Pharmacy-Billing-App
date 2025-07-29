// src/components/Dashboard.jsx
import React from "react";
import StatsPanel from "./StatsPanel";
import ActivityList from "./ActivityList";
import AnalyticsChart from "./AnalyticsChart";
import "../styles/Dashboard.css";
import "../styles/StatsPanel.css";
import "../styles/ActivityList.css";
import "../styles/AnalyticsChart.css";

export default function Dashboard() {
  return (
    <div className="dashboard-content">
      <StatsPanel />
      <div className="content-row">
        <ActivityList />
        <AnalyticsChart />
      </div>
    </div>
  );
}
