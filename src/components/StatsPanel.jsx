import React from "react";

export default function StatsPanel() {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="dark:bg-white/20 p-4 rounded-xl shadow-lg backdrop-blur-md">
        <h3>Total Profit</h3>
        <p className="text-xl font-bold py-1">$19,679</p>
        <span className="text-sm text-green-400 py-1">+17% /month</span>
      </div>
      <div className="dark:bg-white/20 p-4 rounded-xl shadow-lg backdrop-blur-md">
        <h3>Total Sale</h3>
        <p className="text-xl font-bold py-1">$87,857</p>
        <span className="text-sm text-green-400 py-1">+12% /month</span>
      </div>
      <div className="dark:bg-white/20 p-4 rounded-xl shadow-lg backdrop-blur-md">
        <h3>Out of Stock</h3>
        <p className="text-xl font-bold py-1">679</p>
        <span className="text-sm text-fuchsia-500 py-1">+19% /month</span>
      </div>
      <div className="dark:bg-white/20 p-4 rounded-xl shadow-lg backdrop-blur-md">
        <h3>Expired</h3>
        <p className="text-xl font-bold py-1">67</p>
        <span className="text-sm text-red-400 py-1">-12% /month</span>
      </div>
    </div>
  );
}
