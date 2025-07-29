// src/components/Sidebar.jsx
import React from "react";
import "../styles/Sidebar.css";

const menuItems = [
  "Dashboard",
  "Calendar",
  "Receipt",
  "Drugs",
  "Activity",
  "Transaction",
  "Customer",
  "Help Center"
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">Pharmax.</div>
      <ul className="menu">
        {menuItems.map((item, index) => (
          <li key={index} className={index === 0 ? "active" : ""}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}