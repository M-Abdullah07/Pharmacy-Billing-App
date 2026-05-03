import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getUserId } from '../utilis/sessions';
import { facade } from '@/core/facade/createFacade';
import { AddCustomerDialog, SaleItemsTable } from './sales/components';

export default function AddSale({ onSaleRecorded }) {
  // Core data states
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Selected values
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Sale item inputs
  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState('');

  // Sale items list
  const [saleItems, setSaleItems] = useState([]);

  // Credit sale checkbox
  const [isCredit, setIsCredit] = useState(false);

  // Loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // States to show add forms
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Fetch customers from DB
  const refreshCustomers = async () => {
    try {
      const result = await facade.route('getCustomers');
      setCustomers(result || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setErrors((prev) => ({ ...prev, customers: 'Failed to load customers' }));
    }
  };

  // Fetch products from DB
  const refreshProducts = async () => {
    try {
      const result = await facade.route('getProducts');
      setProducts(result || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrors((prev) => ({ ...prev, products: 'Failed to load products' }));
    }
  };

  // Initial load of customers and products
  useEffect(() => {
    refreshCustomers();
    refreshProducts();
  }, []);

  // Handlers for adding new Customer
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Customer name is required');
      return;
    }
    try {
      setIsLoading(true);
      const result = await facade.route('addCustomer', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      if (result.success) {
        await refreshCustomers();
        setSelectedCustomer(result.customerId.toString());
        setShowAddCustomer(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
      } else {
        alert('Failed to add customer: ' + (result.error || 'Unknown Error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add an item to the sale list
  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      alert('Please fill all fields');
      return;
    }
    const product = products.find((p) => p.product_id === selectedProduct);

    if (!product) {
      alert('Invalid selection');
      return;
    }

    const existingItem = saleItems.find((item) => item.productId === product.product_id);
    if (existingItem) {
      alert('This product is already added. Remove it first to change quantity.');
      return;
    }

    setSaleItems((prev) => [
      ...prev,
      {
        productId: product.product_id,
        productName: product.name,
        quantity: parseInt(quantity),
        saleRate: saleRate ? parseFloat(saleRate) : null,
        discountPct: 0,
      },
    ]);

    // Reset input controls
    setQuantity(1);
    setSaleRate('');
    setSelectedProduct('');
  };

  const handleRemoveItem = (index) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit the sale & reduce stock in DB
  const handleSubmitSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      alert('Please select a customer and add at least one item.');
      return;
    }
    const userId = getUserId();
    if (!userId) {
      alert('Please login first.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await facade.route('addSale', {
        customerId: selectedCustomer,
        userId,
        isCredit,
        items: saleItems,
      });
      if (result.success) {
        alert(`Sale recorded successfully! Sale ID: ${result.saleId}`);
        // Reset form
        setSaleItems([]);
        setSelectedCustomer('');
        setIsCredit(false);
        setSelectedProduct('');
        setQuantity(1);
        setSaleRate('');
        if (onSaleRecorded) {
          onSaleRecorded(result.saleId);
        }
      } else {
        alert('Failed to record sale: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error submitting sale: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1">
      {isLoading && <p>Loading...</p>}

      {/* Customer select */}
      <Label className="mb-2">Customers:</Label>
      <div className="flex flex-row items-center gap-2 mb-4">
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Customers</SelectLabel>
              {customers.map((c) => (
                <SelectItem key={c.customer_id} value={c.customer_id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button variant="link" size="sm" onClick={() => setShowAddCustomer(true)}>
          + Add Customer
        </Button>
      </div>

      <AddCustomerDialog
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        newCustomerName={newCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerName={setNewCustomerName}
        setNewCustomerPhone={setNewCustomerPhone}
        onSave={handleAddCustomer}
      />

      {/* Product select */}
      <Label className="mb-2">Product:</Label>
      <div className="flex flex-row items-center gap-2 mb-4">
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Products</SelectLabel>
              {products.map((p) => (
                <SelectItem key={p.product_id} value={p.product_id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity and Sale Rate Inputs */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 w-full max-w-xl space-y-4">
        <div className="space-y-1">
          <Label className="text-lg font-semibold">Add Items to Sale</Label>
          <p className="text-sm text-muted-foreground">
            Enter quantity and sale rate, then add to sale.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            type="number"
            min="1"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Sale Rate Override (optional)"
            value={saleRate}
            onChange={(e) => setSaleRate(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handleAddItem}
            disabled={!selectedProduct || !quantity}
            className="w-full"
          >
            Add Item
          </Button>
        </div>
      </div>

      <SaleItemsTable items={saleItems} onRemove={handleRemoveItem} />

      {/* Credit sale */}
      <div className="flex items-center justify-between mt-8 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox id="credit" checked={isCredit} onCheckedChange={setIsCredit} />
          <Label htmlFor="credit">Credit Sale</Label>
        </div>
        <Button onClick={handleSubmitSale} disabled={saleItems.length === 0 || !selectedCustomer}>
          {' '}
          Submit Sale{' '}
        </Button>
      </div>
    </div>
  );
}
