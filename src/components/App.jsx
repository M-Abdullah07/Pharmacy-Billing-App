import React, { useState } from "react";
import Sidebar from "./Sidebar";
import logo from "../assets/logo.png"; // adjust path as needed
import "../styles/AppLayout.css";

export default function App() {
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState("addSale");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => setSidebarOpen(prev => !prev);

  if (!started) {
    return (
      <div className="home-screen">
        <button onClick={() => setStarted(true)}>Start App</button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top Bar */}
      <div className="topbar">
        <button className="menu-button" onClick={handleToggleSidebar}>
          ☰
        </button>
        <img src={logo} alt="Logo" className="logo" />
        <h1 className="brand-title">Yaqoob Medicine</h1>
      </div>

      {/* Sidebar */}
      {sidebarOpen && <Sidebar onNavigate={(p) => {
        setPage(p);
        setSidebarOpen(false); // close after navigation
      }} />}

      {/* Main Content */}
      <div className="content">
        {page === "addSale" && <div>🧾 Add Sale Page</div>}
        {page === "inventory" && <div>💊 Inventory Page</div>}
        {page === "customers" && <div>👥 Customers Page</div>}
        {page === "reports" && <div>📊 Reports Page</div>}
        {page === "settings" && <div>⚙️ Settings Page</div>}
      </div>
    </div>
  );
}
