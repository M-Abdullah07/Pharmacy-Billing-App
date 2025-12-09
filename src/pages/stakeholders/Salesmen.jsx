import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Search } from 'lucide-react';
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from '@/components/PageLayout';

export default function Salesmen() {
  const [salesmen, setSalesmen] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', cnic: '', address: '', commission_rate: '' });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSalesmen();
  }, []);

  const loadSalesmen = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('get-salesmen');
      setSalesmen(result || []);
    } catch (error) {
      console.error('Error loading salesmen:', error);
      setMessage({ type: 'error', text: 'Failed to load salesmen' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = { ...form, name: form.name.trim() };
    if (!trimmed.name) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    try {
      setIsLoading(true);

      if (editId !== null) {
        // Update existing salesman
        const result = await window.electron.ipcRenderer.invoke('update-salesman', editId, {
          name: trimmed.name,
          phone: trimmed.phone || '',
          cnic: trimmed.cnic || '',
          address: trimmed.address || '',
          commission_rate: parseFloat(trimmed.commission_rate) || 0
        });

        if (result.success) {
          setMessage({ type: 'success', text: 'Salesman updated successfully!' });
          await loadSalesmen();
        } else {
          setMessage({ type: 'error', text: 'Failed to update: ' + (result.error || 'Unknown error') });
        }
      } else {
        // Add new salesman
        const result = await window.electron.ipcRenderer.invoke('add-salesman', {
          name: trimmed.name,
          phone: trimmed.phone || '',
          cnic: trimmed.cnic || '',
          address: trimmed.address || '',
          commission_rate: parseFloat(trimmed.commission_rate) || 0
        });

        if (result.success) {
          setMessage({ type: 'success', text: 'Salesman added successfully!' });
          await loadSalesmen();
        } else {
          setMessage({ type: 'error', text: 'Failed to add: ' + (result.error || 'Unknown error') });
        }
      }

      setForm({ name: '', phone: '', cnic: '', address: '', commission_rate: '' });
      setEditId(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (salesman) => {
    setForm({
      name: salesman.name,
      phone: salesman.phone || '',
      cnic: salesman.cnic || '',
      address: salesman.address || '',
      commission_rate: salesman.commission_rate || '',
    });
    setEditId(salesman.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this salesman?')) return;

    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('delete-salesman', id);

      if (result.success) {
        setMessage({ type: 'success', text: 'Salesman deleted successfully!' });
        await loadSalesmen();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete: ' + (result.error || 'Unknown error') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSalesmen = salesmen.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search)) ||
    (s.cnic && s.cnic.includes(search))
  );

  return (
    <PageContainer
      title="Salesmen"
      description="Manage your sales team and commission rates"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Add/Edit Form */}
      <PageSection
        title={editId ? 'Edit Salesman' : 'Add New Salesman'}
        description="Enter salesman details"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Salesman name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC</Label>
            <Input
              id="cnic"
              name="cnic"
              value={form.cnic}
              onChange={handleChange}
              placeholder="CNIC number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_rate">Commission Rate (%)</Label>
            <Input
              id="commission_rate"
              name="commission_rate"
              type="number"
              step="0.01"
              value={form.commission_rate}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Saving...' : editId ? 'Update' : 'Add Salesman'}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditId(null);
                  setForm({ name: '', phone: '', cnic: '', address: '', commission_rate: '' });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </PageSection>

      {/* Search and List */}
      <PageSection
        title={`All Salesmen (${filteredSalesmen.length})`}
        description="Search and manage salesmen"
        noPadding
      >
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by name, phone, or CNIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading salesmen..." />
        ) : filteredSalesmen.length === 0 ? (
          <EmptyState
            icon={Plus}
            title={search ? "No salesmen found" : "No salesmen yet"}
            description={search ? "Try adjusting your search criteria" : "Add your first salesman using the form above"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>CNIC</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesmen.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.phone || 'N/A'}</TableCell>
                    <TableCell>{s.cnic || 'N/A'}</TableCell>
                    <TableCell>{s.address || 'N/A'}</TableCell>
                    <TableCell>{s.commission_rate}%</TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}