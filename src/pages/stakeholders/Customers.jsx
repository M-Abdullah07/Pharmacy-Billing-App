import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteIcon, Edit } from 'lucide-react';

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
    <div className="space-y-4">

      <h2>{editId ? 'Edit Customer' : 'Add New Customer'}</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
        <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="WhatsApp" />

        <Select>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select an Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>City</SelectLabel>
              {areas.map(area => (
                <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button className="w-[140px]">{editId ? 'Update' : 'Add Customer'}</Button>
        {editId && <Button type="button" onClick={() => { setEditId(null); setForm({ name: '', phone: '', whatsapp: '', area_id: '' }); }}>Cancel</Button>}
      </form>

      {message && <p className="message">{message}</p>}

      <h3>All Customers</h3>
      <div className="flex flex-row gap-4">
        <Input
          placeholder="Search by name/phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>City</SelectLabel>
              {areas.map(area => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Table >
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCustomers.map(c => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.phone}</TableCell>
              <TableCell>{c.whatsapp}</TableCell>
              <TableCell>{c.area_name || '—'}</TableCell>
              <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit /></Button>
                <Button variant="ghost" onClick={() => handleDelete(c.id)}><DeleteIcon className='text-red-500' /></Button>
              </TableCell>
            </TableRow>
          ))}
          {filteredCustomers.length === 0 && (
            <TableRow><TableCell colSpan="6" style={{ textAlign: 'center' }}>No customers found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
