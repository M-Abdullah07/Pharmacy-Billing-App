import React from "react";
import "../styles/SideBar.css";

export default function Sidebar({ onNavigate }) {
  const handleNavigation = (target) => {
    onNavigate(target);
  };

  return (
    <div className="sidebar">
      <button onClick={() => handleNavigation("addSale")}>🧾 Add Sale</button>
      <button onClick={() => handleNavigation("inventory")}>💊 Inventory</button>
      <button onClick={() => handleNavigation("customers")}>👥 Customers</button>
      <button onClick={() => handleNavigation("reports")}>📊 Reports</button>
      <button onClick={() => handleNavigation("settings")}>⚙️ Settings</button>
    </div>
  );
}
