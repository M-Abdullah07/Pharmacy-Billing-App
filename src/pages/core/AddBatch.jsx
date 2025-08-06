import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function AddBatch() {
  const [purchaseInfo, setPurchaseInfo] = useState({
    company: '',
    invoiceNo: '',
    poDate: '',
    status: '',
  });

  const [products, setProducts] = useState([
    { product: '', batchNo: '', invoiceRate: '', saleRate: '', quantity: '', expDate: '' },
  ]);

  const [message, setMessage] = useState(null);

  const handlePurchaseChange = (e) => {
    const { name, value } = e.target;
    setPurchaseInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePurchaseSelectChange = (name, value) => {
    setPurchaseInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const addProductRow = () => {
    setProducts((prev) => [...prev, {
      product: '', batchNo: '', invoiceRate: '', saleRate: '', quantity: '', expDate: ''
    }]);
  };

  const removeProductRow = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setMessage(null);
    const { company, invoiceNo } = purchaseInfo;
    if (!company || !invoiceNo) {
      return setMessage({ type: 'error', text: 'Company and Invoice Number are required.' });
    }

    const validProducts = products.filter((p) => p.product);
    if (validProducts.length === 0) {
      return setMessage({ type: 'error', text: 'Add at least one product.' });
    }

    console.log('Purchase Info:', purchaseInfo);
    console.log('Products:', validProducts);
    setMessage({ type: 'success', text: 'Batch saved successfully!' });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen rounded-lg shadow-lg space-y-6">
      <h2 className="text-3xl font-bold border-b pb-4 text-gray-800">Add New Batch</h2>

      {message && (
        <div className={cn(
          "p-3 rounded-md text-sm font-medium",
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        )}>
          {message.text}
        </div>
      )}

      {/* Purchase Info */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Purchase Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Company */}
          <div>
            <Label htmlFor="company">Company</Label>
            <Select
              value={purchaseInfo.company}
              onValueChange={(value) => handlePurchaseSelectChange('company', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Companies</SelectLabel>
                  <SelectItem value="pharma-a">Pharma A</SelectItem>
                  <SelectItem value="pharma-b">Pharma B</SelectItem>
                  <SelectItem value="pharma-c">Pharma C</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice No */}
          <div>
            <Label htmlFor="invoiceNo">Invoice Number</Label>
            <Input
              id="invoiceNo"
              name="invoiceNo"
              value={purchaseInfo.invoiceNo}
              onChange={handlePurchaseChange}
              placeholder="e.g. INV-123"
            />
          </div>

          {/* PO Date */}
          <div>
            <Label htmlFor="poDate">PO Date</Label>
            <Input
              id="poDate"
              type="date"
              name="poDate"
              value={purchaseInfo.poDate}
              onChange={handlePurchaseChange}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={purchaseInfo.status}
              onValueChange={(value) => handlePurchaseSelectChange('status', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status Options</SelectLabel>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-xl font-semibold text-gray-700">Products in Batch</h3>
          <Button onClick={addProductRow} variant="outline" className="gap-2">
            <Plus size={16} /> Add Product
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Invoice Rate</TableHead>
                <TableHead>Sale Rate</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Exp Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select
                      value={p.product}
                      onValueChange={(value) => handleProductChange(idx, 'product', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Products</SelectLabel>
                          <SelectItem value="Paracetamol">Paracetamol</SelectItem>
                          <SelectItem value="Aspirin">Aspirin</SelectItem>
                          <SelectItem value="Amoxicillin">Amoxicillin</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={p.batchNo}
                      onChange={(e) => handleProductChange(idx, 'batchNo', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.invoiceRate}
                      onChange={(e) => handleProductChange(idx, 'invoiceRate', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.saleRate}
                      onChange={(e) => handleProductChange(idx, 'saleRate', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.quantity}
                      onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={p.expDate}
                      onChange={(e) => handleProductChange(idx, 'expDate', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => removeProductRow(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Save Batch</Button>
      </div>
    </div>
  );
}
