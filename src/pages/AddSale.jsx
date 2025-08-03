import React, { useState, useEffect } from 'react';
import '../styles/AddSale.css';

export default function AddSale() {
  // Core data states
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  // Selected values
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  // Sale item inputs
  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState("");

  // Sale items list
  const [saleItems, setSaleItems] = useState([]);

  // Credit sale checkbox
  const [isCredit, setIsCredit] = useState(false);

  // Loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // States to show add forms
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicine, setNewMedicine] = useState({ name: "", type: "" });

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batch_no: "",
    purchase_rate: "",
    quantity: "",
    expiry: ""
  });

  // Electron API shortcut
  const api = window.electronAPI;

  // Fetch customers from DB
  const refreshCustomers = async () => {
    try {
      const result = await api.queryDb("SELECT id, name FROM customers");
      setCustomers(result || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setErrors(prev => ({ ...prev, customers: 'Failed to load customers' }));
    }
  };

  // Fetch medicines from DB
  const refreshMedicines = async () => {
    try {
      const result = await api.queryDb("SELECT id, name FROM medicines");
      setMedicines(result || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setErrors(prev => ({ ...prev, medicines: 'Failed to load medicines' }));
    }
  };

  // Fetch batches for selected medicine and with stock > 0
  const refreshBatches = async (medicineId) => {
    try {
      const result = await api.queryDb(
        "SELECT * FROM batches WHERE medicine_id = ? AND quantity_available > 0", [medicineId]
      );
      setBatches(result || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setErrors(prev => ({ ...prev, batches: 'Failed to load batches' }));
    }
  };

  // Initial load of customers and medicines
  useEffect(() => {
    refreshCustomers();
    refreshMedicines();
  }, []);

  // Load batches when medicine changes
  useEffect(() => {
    if (selectedMedicine) {
      refreshBatches(selectedMedicine);
      setSelectedBatch("");
    } else {
      setBatches([]);
      setSelectedBatch("");
    }
  }, [selectedMedicine]);

  // Auto fill sale rate on batch change
  useEffect(() => {
    if (selectedBatch) {
      const batch = batches.find(b => b.id === parseInt(selectedBatch));
      if (batch && batch.sale_rate) {
        setSaleRate(batch.sale_rate.toString());
      }
    }
  }, [selectedBatch, batches]);

  // Handlers for adding new Customer
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert("Customer name is required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-customer", {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim()
      });
      if (result.success) {
        await refreshCustomers();
        setSelectedCustomer(result.customerId.toString());
        setShowAddCustomer(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
      } else {
        alert("Failed to add customer: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for adding new Medicine
  const handleAddMedicine = async () => {
    if (!newMedicine.name.trim()) {
      alert("Medicine name is required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-medicine", {
        name: newMedicine.name.trim(),
        type: newMedicine.type.trim()
      });
      if (result.success) {
        await refreshMedicines();
        setSelectedMedicine(result.medicineId.toString());
        setShowAddMedicine(false);
        setNewMedicine({ name: "", type: "" });
      } else {
        alert("Failed to add medicine: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for adding new Batch
  const handleAddBatch = async () => {
    const { batch_no, purchase_rate, quantity, expiry } = newBatch;
    if (!batch_no.trim() || !purchase_rate || !quantity || !expiry) {
      alert("Please fill all batch fields");
      return;
    }
    if (!selectedMedicine) {
      alert("Please select a medicine first");
      return;
    }
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke("add-batch", {
        medicineId: selectedMedicine,
        batch_no: batch_no.trim(),
        purchase_rate: parseFloat(purchase_rate),
        quantity: parseInt(quantity, 10),
        expiry_date: expiry
      });
      if (result.success) {
        await refreshBatches(selectedMedicine);
        setSelectedBatch(result.batchId.toString());
        setShowAddBatch(false);
        setNewBatch({ batch_no: "", purchase_rate: "", quantity: "", expiry: "" });
      } else {
        alert("Failed to add batch: " + (result.error || "Unknown Error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add an item to the sale list
  const handleAddItem = () => {
    if (!selectedBatch || !quantity || !saleRate) {
      alert("Please fill all fields");
      return;
    }
    const batch = batches.find(b => b.id === parseInt(selectedBatch));
    const medicine = medicines.find(m => m.id === parseInt(selectedMedicine));

    if (!batch || !medicine) {
      alert("Invalid selection");
      return;
    }

    if (quantity > batch.quantity_available) {
      alert(`Insufficient stock! Available: ${batch.quantity_available}`);
      return;
    }

    const existingItem = saleItems.find(item => item.batchId === batch.id);
    if (existingItem) {
      alert("This batch is already added. Remove it first to change quantity.");
      return;
    }

    const totalAmount = quantity * parseFloat(saleRate);

    setSaleItems(prev => [
      ...prev,
      {
        batchId: batch.id,
        medicineName: medicine.name,
        batchNumber: batch.batch_number,
        quantity: parseInt(quantity),
        saleRate: parseFloat(saleRate),
        totalAmount,
        expiry: batch.expiry_date
      }
    ]);

    // Reset input controls
    setQuantity(1);
    setSaleRate("");
    setSelectedBatch("");
    setSelectedMedicine("");
  };

  const handleRemoveItem = (index) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit the sale & reduce stock in DB
  const handleSubmitSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      alert("Please select a customer and add at least one item.");
      return;
    }
  
    try {
      setIsLoading(true);
      const totalAmount = saleItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const result = await window.electron.ipcRenderer.invoke("execute-transaction", {
        type: "add-sale",
        data: {
          customerId: selectedCustomer,
          isCredit,
          items: saleItems,
          totalAmount
        }
      });
      if (result.success) {
        alert(`Sale recorded successfully! Sale ID: ${result.saleId}`);
        // Reset form
        setSaleItems([]);
        setSelectedCustomer("");
        setIsCredit(false);
        setSelectedMedicine("");
        setSelectedBatch("");
        setQuantity(1);
        setSaleRate("");
      } else {
        alert("Failed to record sale: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error submitting sale: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotal = saleItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="add-sale-container">

      <h2>Add Sale</h2>

      {isLoading && <p>Loading...</p>}

      {/* Customer select */}
      <label>
        Customer:
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="">-- Select Customer --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowAddCustomer(true)}>+ Add Customer</button>
      </label>

      {/* Add Customer Inline Form */}
      {showAddCustomer && (
        <div className="add-customer-form">
          <h4>Add New Customer</h4>
          <input
            type="text"
            placeholder="Customer Name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Phone (optional)"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
          />
          <button onClick={handleAddCustomer}>Save</button>
          <button onClick={() => setShowAddCustomer(false)}>Cancel</button>
        </div>
      )}

      {/* Medicine select */}
      <label>
        Medicine:
        <select
          value={selectedMedicine}
          onChange={(e) => setSelectedMedicine(e.target.value)}
        >
          <option value="">-- Select Medicine --</option>
          {medicines.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowAddMedicine(true)}>+ Add Medicine</button>
      </label>

      {/* Add Medicine Inline Form */}
      {showAddMedicine && (
        <div className="add-medicine-form">
          <h4>Add New Medicine</h4>
          <input
            type="text"
            placeholder="Name"
            value={newMedicine.name}
            onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Type"
            value={newMedicine.type}
            onChange={(e) => setNewMedicine({ ...newMedicine, type: e.target.value })}
          />
          <button onClick={handleAddMedicine}>Save</button>
          <button onClick={() => setShowAddMedicine(false)}>Cancel</button>
        </div>
      )}

      {/* Batch select */}
      <label>
        Batch:
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          disabled={!selectedMedicine}
        >
          <option value="">-- Select Batch --</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>
              {b.batch_number} (Exp: {b.expiry_date}, Qty: {b.quantity_available})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!selectedMedicine) {
              alert("Please select a medicine first to add a batch.");
              return;
            }
            setShowAddBatch(true);
          }}
          disabled={!selectedMedicine}
        >
          + Add Batch
        </button>
      </label>

      {/* Add Batch Inline Form */}
      {showAddBatch && (
        <div className="add-batch-form">
          <h4>Add New Batch</h4>
          <input
            type="text"
            placeholder="Batch Number"
            value={newBatch.batch_no}
            onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
          />
          <input
            type="number"
            placeholder="Purchase Rate"
            value={newBatch.purchase_rate}
            onChange={(e) => setNewBatch({ ...newBatch, purchase_rate: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newBatch.quantity}
            onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
          />
          <input
            type="date"
            placeholder="Expiry Date"
            value={newBatch.expiry}
            onChange={(e) => setNewBatch({ ...newBatch, expiry: e.target.value })}
          />
          <button onClick={handleAddBatch}>Save</button>
          <button onClick={() => setShowAddBatch(false)}>Cancel</button>
        </div>
      )}

      {/* Quantity and Sale Rate Inputs */}
      <div className="sale-item-inputs">
        <input
          type="number"
          min="1"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={!selectedBatch}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Sale Rate"
          value={saleRate}
          onChange={(e) => setSaleRate(e.target.value)}
          disabled={!selectedBatch}
        />
        <button onClick={handleAddItem} disabled={!selectedBatch || !quantity || !saleRate}>
          Add Item
        </button>
      </div>

      {/* Sale items table */}
      <table className="sale-items-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Total</th>
            <th>Expiry</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {saleItems.length === 0 && (
            <tr><td colSpan="7" style={{ textAlign: 'center' }}>No items added</td></tr>
          )}
          {saleItems.map((item, index) => (
            <tr key={index}>
              <td>{item.medicineName}</td>
              <td>{item.batchNumber}</td>
              <td>{item.quantity}</td>
              <td>₹{item.saleRate.toFixed(2)}</td>
              <td>₹{item.totalAmount.toFixed(2)}</td>
              <td>{item.expiry}</td>
              <td>
                <button onClick={() => handleRemoveItem(index)}>Remove</button>
              </td>
            </tr>
          ))}
          {saleItems.length > 0 && (
            <tr>
              <td colSpan="4" style={{ fontWeight: 'bold', textAlign: 'right' }}>Grand Total:</td>
              <td colSpan="3" style={{ fontWeight: 'bold' }}>₹{grandTotal.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Credit sale */}
      <label>
        <input
          type="checkbox"
          checked={isCredit}
          onChange={(e) => setIsCredit(e.target.checked)}
        />
        Credit Sale
      </label>

      {/* Submit */}
      <button onClick={handleSubmitSale} disabled={saleItems.length === 0 || !selectedCustomer}>
        Submit Sale
      </button>

    </div>
  );
}
