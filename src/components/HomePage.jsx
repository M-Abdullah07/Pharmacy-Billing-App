import React from "react";
import { FaPrescriptionBottle } from "react-icons/fa";
import "../styles/HomePage.css";

export default function HomePage({ onStart }) {
  return (
    <div className="homepage-container">
      <div className="card">
        <FaPrescriptionBottle className="icon" />
        <h1>PharmaEase</h1>
        <p>Effortless Pharmacy Management</p>
        <button onClick={onStart}>🚀 Launch App</button>
      </div>
    </div>
  );
}
