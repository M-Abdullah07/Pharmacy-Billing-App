import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    form: '',
    uom: '',
    quantity_in_uom: '',
    is_addictive: false,
    is_imported: false,
    retail_price: '',
    withheld_price: '',
    shelf_no: '',
    hold_sale: false,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getProducts();
      if (Array.isArray(data)) {
        setProducts(data);
        setError('');
      } else {
        setError(data?.error || 'Failed to load products.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      alert('Product name is required.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.addProduct(newProduct);
      if (result.success) {
        setShowAddModal(false);
        resetForm();
        await loadProducts();
      } else {
        alert(result.error || 'Failed to add product.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      form: '',
      uom: '',
      quantity_in_uom: '',
      is_addictive: false,
      is_imported: false,
      retail_price: '',
      withheld_price: '',
      shelf_no: '',
      hold_sale: false,
    });
  };

  const handleInputChange = (field, value) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.form?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.shelf_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return amount ? `Rs ${parseFloat(amount).toFixed(2)}` : 'Rs 0.00';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {/* Professional Controls */}
      <div className="flex flex-row gap-6">
        <Input
          className="w-[400px]"
          type="text"
          placeholder="Search products by name, form, or shelf number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => setShowAddModal(true)}
          disabled={loading}
        >
          ➕ Add New Product
        </Button>
      </div>

      {/* Professional Error Display */}
      {error && <div className="error">{error}</div>}

      {/* Professional Table */}
      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Addictive</TableHead>
              <TableHead>Imported</TableHead>
              <TableHead>Retail Price</TableHead>
              <TableHead>Wholesale Price</TableHead>
              <TableHead>Shelf Location</TableHead>
              <TableHead>Hold Sale</TableHead>
              <TableHead>Date Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(product => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.form || '—'}</TableCell>
                <TableCell>{product.uom || '—'}</TableCell>
                <TableCell>{product.quantity_in_uom || 0}</TableCell>
                <TableCell>{product.is_addictive ? 'Yes' : 'No'}</TableCell>
                <TableCell>{product.is_imported ? 'Yes' : 'No'}</TableCell>
                <TableCell>{formatCurrency(product.retail_price)}</TableCell>
                <TableCell>{formatCurrency(product.withheld_price)}</TableCell>
                <TableCell>{product.shelf_no || '—'}</TableCell>
                <TableCell>{product.hold_sale ? 'Yes' : 'No'}</TableCell>
                <TableCell>{formatDate(product.created_at)}</TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan="11">
                  {searchQuery ? 'No products match your search criteria.' : 'No products available. Add your first product to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the details and click save to add a new customer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4">
            <Input
              type="text"
              placeholder="Product Name *"
              value={newProduct.name}
              onChange={e => handleInputChange('name', e.target.value)}
              required
            />
            <Input
              type="text"
              placeholder="Form (e.g., Tablet, Syrup)"
              value={newProduct.form}
              onChange={e => handleInputChange('form', e.target.value)}
            />
            <Input
              type="text"
              placeholder="Unit of Measure"
              value={newProduct.uom}
              onChange={e => handleInputChange('uom', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Quantity in UOM"
              value={newProduct.quantity_in_uom}
              onChange={e => handleInputChange('quantity_in_uom', parseInt(e.target.value) || '')}
              min="0"
            />
            <Input
              type="number"
              placeholder="Retail Price (Rs)"
              value={newProduct.retail_price}
              onChange={e => handleInputChange('retail_price', parseFloat(e.target.value) || '')}
              min="0"
              step="0.01"
            />
            <Input
              type="number"
              placeholder="Wholesale Price (Rs)"
              value={newProduct.withheld_price}
              onChange={e => handleInputChange('withheld_price', parseFloat(e.target.value) || '')}
              min="0"
              step="0.01"
            />
            <Input
              type="text"
              placeholder="Shelf Number"
              value={newProduct.shelf_no}
              onChange={e => handleInputChange('shelf_no', e.target.value)}
            />
          </div>

          <div className='space-y-3'>
            <div className="flex items-center gap-2">
              <Checkbox id="controlled-sub" />
              <Label htmlFor="controlled-sub">Controled/Addictive Substance</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="imported" />
              <Label htmlFor="imported">Imported Product</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="hold" />
              <Label htmlFor="hold">Hold Sale (Temporarily Unavailable)</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleAddProduct}>Save</Button>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
