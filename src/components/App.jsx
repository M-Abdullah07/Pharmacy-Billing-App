import React from "react";
import Sidebar from "./Sidebar";
import UsersPanel from "./UsersPanel";

export default function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <UsersPanel />
      </main>
    </div>
  );
}
