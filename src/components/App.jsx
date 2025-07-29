// src/components/App.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Dashboard from "./Dashboard";
import AddSale from "./AddSale";
import "../styles/AppLayout.css"; // Create if needed

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const handleNavigate = (page) => {
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case "Add Sale":
        return <AddSale />;
      case "Dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar onNavigate={handleNavigate} />
      <div className="main-content">
        <Header />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
