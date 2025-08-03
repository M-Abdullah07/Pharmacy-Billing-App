import React from "react";

export default function Header({ username, onLogout }) {
  return (
    <header className="flex justify-end items-center py-2 px-3 bg-white">
      <div className="flex items-center gap-3">
        <span>{username}</span>
        <button className="bg-red-500 px-2 py-1 border border-gray-400 text-white rounded-xl" onClick={onLogout}>Logout</button>
        <img src="https://i.pravatar.cc/40" alt="User avatar" className="rounded-full" />
      </div>
    </header>
  );
}
