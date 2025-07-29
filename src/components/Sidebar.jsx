import React from "react";
import { UserCircleIcon } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md h-full">
      <div className="p-4 text-xl font-bold border-b flex items-center gap-2">
        <UserCircleIcon className="w-6 h-6" />
        Pharma Admin
      </div>
      <nav className="p-4">
        <ul className="space-y-3">
          <li>
            <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-100">
              Users
            </button>
          </li>
          <li>
            <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-100">
              Inventory
            </button>
          </li>
          <li>
            <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-100">
              Sales
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
