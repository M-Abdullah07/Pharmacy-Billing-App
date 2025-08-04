import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

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
    <div className="space-y-24">

      <form onSubmit={handleSubmit}>
        <Label className="mb-4">Add a new Company Record:</Label>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Company Name" required />
          <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" />
          <Input name="contact" value={form.contact} onChange={handleChange} placeholder="Contact" />
          <Input name="ntn" value={form.ntn} onChange={handleChange} placeholder="NTN No." />
          <Input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person" />
        </div>
        <Button type="submit">Add Company</Button>
      </form>

      {message && <p className="message">{message}</p>}

      <Table>
        <TableCaption>All Companies</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>NTN</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map(c => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.contact}</TableCell>
              <TableCell>{c.contact_person}</TableCell>
              <TableCell>{c.ntn}</TableCell>
              <TableCell>{c.address}</TableCell>
              <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {companies.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No companies found.</td></tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
