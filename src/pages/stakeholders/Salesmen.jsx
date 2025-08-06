import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit } from 'lucide-react';

export default function AddSalesman() {
  const [salesmen, setSalesmen] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', cnic: '', address: '' });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = { ...form, name: form.name.trim() };
    if (!trimmed.name) return;

    if (editId !== null) {
      setSalesmen(prev =>
        prev.map(s => (s.id === editId ? { ...s, ...trimmed } : s))
      );
      setMessage('✅ Salesman updated.');
    } else {
      setSalesmen(prev => [...prev, { ...trimmed, id: Date.now(), created_at: new Date() }]);
      setMessage('✅ Salesman added.');
    }

    setForm({ name: '', phone: '', cnic: '', address: '' });
    setEditId(null);
  };

  const handleEdit = (salesman) => {
    setForm({
      name: salesman.name,
      phone: salesman.phone,
      cnic: salesman.cnic,
      address: salesman.address,
    });
    setEditId(salesman.id);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this salesman?')) return;
    setSalesmen(prev => prev.filter(s => s.id !== id));
    setMessage('🗑️ Salesman deleted.');
  };

  const filteredSalesmen = salesmen.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    s.cnic.includes(search)
  );

  return (
    <div className="space-y-4 p-6 w-full max-w-7xl mx-auto">
      <h2>{editId ? 'Edit Salesman' : 'Add New Salesman'}</h2>
      
      <div onSubmit={handleSubmit} className="grid grid-cols-4 gap-6">
        <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
        <Input name="cnic" value={form.cnic} onChange={handleChange} placeholder="CNIC" />
        <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" />
        
        <Button onClick={handleSubmit} className="w-[140px] col-span-2">
          {editId ? 'Update' : 'Add Salesman'}
        </Button>
        
        {editId && (
          <Button onClick={() => {
            setEditId(null);
            setForm({ name: '', phone: '', cnic: '', address: '' });
          }} className="col-span-2">
            Cancel
          </Button>
        )}
      </div>

      {message && <p className="message">{message}</p>}

      <h3>All Salesmen</h3>
      
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by name/phone/CNIC"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>CNIC</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSalesmen.map(s => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.phone}</TableCell>
              <TableCell>{s.cnic}</TableCell>
              <TableCell>{s.address}</TableCell>
              <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                  <Edit />
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filteredSalesmen.length === 0 && (
            <TableRow>
              <TableCell colSpan="6" className="text-center">No salesmen found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}