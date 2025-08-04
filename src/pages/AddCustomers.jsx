import React, { useEffect, useState } from 'react';
import '../styles/AddCustomer.css';

export default function AddCustomer() {
  const [areas, setAreas] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', area_id: '' });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');

  useEffect(() => {
    loadAreas();
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, search, filterArea]);

  const loadAreas = async () => {
    const data = await window.electronAPI.getAreas();
    setAreas(data);
  };

  const loadCustomers = async () => {
    const data = await window.electronAPI.getCustomers();
    setCustomers(data);
  };

  const filterCustomers = () => {
    const filtered = customers.filter(c =>
      (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)) &&
      (!filterArea || c.area_id == filterArea)
    );
    setFilteredCustomers(filtered);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = { ...form, name: form.name.trim() };
    if (!trimmed.name) return;

    let res;
    if (editId) {
      res = await window.electronAPI.runDb(
        `UPDATE customers SET name = ?, phone = ?, whatsapp = ?, area_id = ? WHERE id = ?`,
        [trimmed.name, trimmed.phone, trimmed.whatsapp, trimmed.area_id || null, editId]
      );
      setMessage('✅ Customer updated.');
    } else {
      res = await window.electronAPI.addCustomer(trimmed);
      if (res.success) setMessage('✅ Customer added.');
      else setMessage(`❌ ${res.error}`);
    }

    setForm({ name: '', phone: '', whatsapp: '', area_id: '' });
    setEditId(null);
    await loadCustomers();
  };

  const handleEdit = (customer) => {
    setForm({
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      area_id: customer.area_id?.toString() || '',
    });
    setEditId(customer.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await window.electronAPI.runDb(`DELETE FROM customers WHERE id = ?`, [id]);
    await loadCustomers();
    setMessage('🗑️ Customer deleted.');
  };

  return (
    <div className="add-customer-page">
      <h2>{editId ? 'Edit Customer' : 'Add New Customer'}</h2>

      <form onSubmit={handleSubmit} className="customer-form">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
        <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="WhatsApp" />

        <select name="area_id" value={form.area_id} onChange={handleChange} required>
          <option value="">Select Area</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>

        <button type="submit">{editId ? 'Update' : 'Add Customer'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', phone: '', whatsapp: '', area_id: '' }); }}>Cancel</button>}
      </form>

      {message && <p className="message">{message}</p>}

      <hr />

      <h3>All Customers</h3>
      <div className="filters">
        <input
          placeholder="Search by name/phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
          <option value="">All Areas</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>

      <table className="customers-table">
        <thead>
          <tr>
            <th>Name</th><th>Phone</th><th>WhatsApp</th><th>Area</th><th>Created</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.whatsapp}</td>
              <td>{c.area_name || '—'}</td>
              <td>{new Date(c.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => handleEdit(c)}>✏️</button>
                <button onClick={() => handleDelete(c.id)}>🗑️</button>
              </td>
            </tr>
          ))}
          {filteredCustomers.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No customers found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
