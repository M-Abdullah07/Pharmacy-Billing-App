// src/components/AddSale.jsx
import React, { useState, useEffect } from "react";
import "../styles/AddSale.css";

export default function AddSale() {
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [isCredit, setIsCredit] = useState(false);

  const refreshCustomers = async () => {
    const result = await window.api.queryDb("SELECT id, name FROM customers");
    setCustomers(result);
  };

  const refreshMedicines = async () => {
    const result = await window.api.queryDb("SELECT id, name FROM medicines");
    setMedicines(result);
  };

  const refreshBatches = async (medicineId) => {
    const result = await window.api.queryDb(
      "SELECT * FROM batches WHERE medicine_id = ? AND quantity > 0",
      [medicineId]
    );
    setBatches(result);
  };

  useEffect(() => {
    refreshCustomers();
    refreshMedicines();
  }, []);

  useEffect(() => {
    if (selectedMedicine) {
      refreshBatches(selectedMedicine);
    } else {
      setBatches([]);
    }
  }, [selectedMedicine]);

  const handleCustomerChange = async (e) => {
    const value = e.target.value;
    if (value === "new") {
      const name = prompt("Enter new customer name:");
      if (name) {
        await window.api.queryDb("INSERT INTO customers (name) VALUES (?)", [name]);
        await refreshCustomers();
        const res = await window.api.queryDb("SELECT id FROM customers WHERE name = ?", [name]);
        setSelectedCustomer(res[0]?.id || "");
      }
    } else {
      setSelectedCustomer(value);
    }
  };

  const handleMedicineChange = async (e) => {
    const value = e.target.value;
    if (value === "new") {
      const name = prompt("Enter new medicine name:");
      if (name) {
        await window.api.queryDb("INSERT INTO medicines (name) VALUES (?)", [name]);
        await refreshMedicines();
        const res = await window.api.queryDb("SELECT id FROM medicines WHERE name = ?", [name]);
        setSelectedMedicine(res[0]?.id || "");
      }
    } else {
      setSelectedMedicine(value);
    }
  };

  const handleBatchChange = async (e) => {
    const value = e.target.value;
    if (value === "new") {
      const batch_number = prompt("Enter new batch number:");
      const expiry_date = prompt("Enter expiry date (YYYY-MM-DD):");
      const quantity = parseInt(prompt("Enter quantity:"));
      const purchase_rate = parseFloat(prompt("Enter purchase rate:"));
      const sale_rate = parseFloat(prompt("Enter default sale rate:"));
      if (batch_number && expiry_date && quantity && purchase_rate && sale_rate && selectedMedicine) {
        await window.api.queryDb(
          `INSERT INTO batches (medicine_id, batch_number, expiry_date, quantity, purchase_rate, sale_rate)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [selectedMedicine, batch_number, expiry_date, quantity, purchase_rate, sale_rate]
        );
        await refreshBatches(selectedMedicine);
        const res = await window.api.queryDb(
          "SELECT id FROM batches WHERE batch_number = ? AND medicine_id = ?",
          [batch_number, selectedMedicine]
        );
        setSelectedBatch(res[0]?.id || "");
      }
    } else {
      setSelectedBatch(value);
    }
  };

  const handleAddItem = () => {
    if (!selectedBatch || !quantity || !saleRate) return;
    const batch = batches.find(b => b.id === parseInt(selectedBatch));
    const medicine = medicines.find(m => m.id === parseInt(selectedMedicine));

    setSaleItems(prev => [
      ...prev,
      {
        batchId: batch.id,
        medicineName: medicine.name,
        quantity,
        saleRate,
        expiry: batch.expiry_date
      }
    ]);

    setQuantity(1);
    setSaleRate("");
    setSelectedBatch("");
    setSelectedMedicine("");
  };

  return (
    <div className="add-sale-page">
      <h2>Add New Sale</h2>

      <div className="form-row">
        <label>Customer</label>
        <select value={selectedCustomer} onChange={handleCustomerChange}>
          <option value="">-- Select --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="new">+ Add New Customer</option>
        </select>
      </div>

      <div className="form-row">
        <label>Medicine</label>
        <select value={selectedMedicine} onChange={handleMedicineChange}>
          <option value="">-- Select --</option>
          {medicines.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
          <option value="new">+ Add New Medicine</option>
        </select>
      </div>

      <div className="form-row">
        <label>Batch</label>
        <select value={selectedBatch} onChange={handleBatchChange}>
          <option value="">-- Select --</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>
              {b.batch_number} — Exp: {b.expiry_date} — Stock: {b.quantity}
            </option>
          ))}
          <option value="new">+ Add New Batch</option>
        </select>
      </div>

      <div className="form-row">
        <label>Quantity</label>
        <input type="number" value={quantity} min="1" onChange={(e) => setQuantity(parseInt(e.target.value))} />
      </div>

      <div className="form-row">
        <label>Sale Rate</label>
        <input type="number" value={saleRate} onChange={(e) => setSaleRate(parseFloat(e.target.value))} />
      </div>

      <button onClick={handleAddItem}>+ Add Item</button>

      <h3>Sale Items</h3>
      <ul className="sale-items">
        {saleItems.map((item, i) => (
          <li key={i}>
            {item.medicineName} — {item.quantity} units @ {item.saleRate} (Exp: {item.expiry})
          </li>
        ))}
      </ul>

      <div className="form-row">
        <label>
          <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
          Credit Sale
        </label>
      </div>

      <button className="submit-btn">Submit Sale</button>
    </div>
  );
}
