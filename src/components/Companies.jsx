import React, { useEffect, useState } from 'react';
import '../styles/Companies.css';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    name: '',
    address: '',
    contact: '',
    ntn: '',
    contact_person: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

const loadCompanies = async () => {
  //console.log("📞 Calling getCompanies...");
  const data = await window.electronAPI.getCompanies();
  //console.log("📦 Fetched companies:", data);

  if (Array.isArray(data)) {
    setCompanies(data);
  } else {
    console.warn("❗ Expected array but got:", data);
    setCompanies([]);
  }
};



  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, address, contact, ntn, contact_person } = form;

    if (!name.trim()) {
      setMessage('❌ Name is required.');
      return;
    }

    const res = await window.electronAPI.addCompany(
  `INSERT INTO companies (name, address, contact, ntn, contact_person) VALUES (?, ?, ?, ?, ?)`,
  [name.trim(), address, contact, ntn, contact_person]
);


    if (res.success) {
      setMessage('✅ Company added.');
      setForm({ name: '', address: '', contact: '', ntn: '', contact_person: '' });
      loadCompanies();
    } else {
      setMessage(`❌ ${res.error}`);
    }
  };

  return (
    
    <div className="companies-page">
  <div className="page-header">
    <h2>Company Management</h2>
    <p className="page-subtitle">Manage your business partners and clients</p>
  </div>

  <form className="company-form" onSubmit={handleSubmit}>
    <div className="form-grid">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Company Name" required />
      <input name="address" value={form.address} onChange={handleChange} placeholder="Address" />
      <input name="contact" value={form.contact} onChange={handleChange} placeholder="Contact" />
      <input name="ntn" value={form.ntn} onChange={handleChange} placeholder="NTN No." />
      <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person" />
    </div>
    <button className="submit-btn" type="submit">Add Company</button>
  </form>

  {message && <p className="message">{message}</p>}

  <hr />

  <h3>All Companies</h3>
  <div className="table-container">
    <table className="companies-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Contact Person</th>
          <th>NTN</th>
          <th>Address</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {companies.map(c => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.contact}</td>
            <td>{c.contact_person}</td>
            <td>{c.ntn}</td>
            <td>{c.address}</td>
            <td>{new Date(c.created_at).toLocaleString()}</td>
          </tr>
        ))}
        {companies.length === 0 && (
          <tr><td colSpan="6" style={{ textAlign: 'center' }}>No companies found.</td></tr>
        )}
      </tbody>
    </table>
  </div>
</div>
  );
}
