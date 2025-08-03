// src/components/Sidebar.jsx
import React from "react";
import "../styles/SideBar.css";

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
    <div className="p-6 bg-gray-200/80 shadow-xl">
      <div className="text-black text-xl font-bold mb-8">Pharmax.</div>
      <ul className="flex flex-col gap-2">
        {menuItems.map((item, index) => (
          <div key={index} onClick={() => onNavigate(item)} className="hover:bg-white py-2 px-3 rounded-2xl hover:cursor-pointer">
            {item}
          </div>
        ))}
      </ul>
    </div>
  );
}
