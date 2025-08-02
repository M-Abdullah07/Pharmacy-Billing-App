import React, { useState } from 'react';
import '../styles/AddArea.css'; // optional, for styling

export default function AddArea() {
  const [areaName, setAreaName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    const result = await window.electronAPI.addArea(areaName.trim());

    if (result.success) {
      setMessage(`✅ Area added with ID ${result.id}`);
      setAreaName('');
    } else {
      setMessage(`❌ Error: ${result.error}`);
    }
  };

  return (
    <div className="add-area-page">
      <h2>Add New Area</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          placeholder="Enter area name"
        />
        <button type="submit">Add Area</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
