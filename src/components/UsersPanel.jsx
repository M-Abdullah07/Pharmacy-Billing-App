import React, { useEffect, useState } from "react";
import { Trash2Icon, PlusIcon } from "lucide-react";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");

  const fetchUsers = async () => {
    try {
      const result = await window.electronAPI.queryDb("SELECT * FROM users");
      setUsers(result);
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  const addUser = async () => {
    if (!name.trim()) return;
    await window.electronAPI.queryDb("INSERT INTO users (name) VALUES (?)", [name]);
    setName("");
    fetchUsers();
  };

  const deleteUser = async (id) => {
    await window.electronAPI.queryDb("DELETE FROM users WHERE id = ?", [id]);
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Manage Users</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter user name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border px-3 py-2 rounded shadow-sm"
        />
        <button
          onClick={addUser}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="bg-white p-3 rounded shadow flex justify-between items-center"
          >
            <span>{user.name}</span>
            <button
              onClick={() => deleteUser(user.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2Icon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
