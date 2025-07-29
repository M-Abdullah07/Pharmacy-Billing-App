// src/components/Dashboard.jsx
import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import StatsPanel from "./StatsPanel";
import ActivityList from "./ActivityList";
import AnalyticsChart from "./AnalyticsChart";
import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Header.css";
import "../styles/StatsPanel.css";
import "../styles/ActivityList.css";
import "../styles/AnalyticsChart.css";

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <StatsPanel />
        <div className="content-row">
          <ActivityList />
          <AnalyticsChart />
        </div>
      </div>
    </div>
  );
}