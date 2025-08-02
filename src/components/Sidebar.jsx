// src/components/Sidebar.jsx
import React from "react";
import "../styles/Sidebar.css";

const menuItems = [
  "Dashboard",
  "Add Sale",
  "Companies",
  "Products",
  "Areas",
  "Add Batch",
  "Credit Dues",
  "Sales Reports",
  "Customers",
  "Settings",
  "Backup & Export",
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="logo">Pharmax.</div>
      <ul className="menu">
        {menuItems.map((item, index) => (
          <li key={index} onClick={() => onNavigate(item)}>
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}


