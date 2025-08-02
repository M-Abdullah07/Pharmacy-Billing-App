// src/components/Header.jsx
import React from "react";
import "../styles/Header.css";

export default function Header({ username, onLogout }) {
  return (
    <header className="header">
      <input className="search" type="text" placeholder="Search anything here..." />
      <div className="user-info">
        <span>{username}</span>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
        <img src="https://i.pravatar.cc/40" alt="User avatar" />
      </div>
    </header>
  );
}
