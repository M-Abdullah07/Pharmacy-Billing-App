import React, { useState, useEffect } from 'react';
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
import { Trash2, Plus, Package } from 'lucide-react';
import { PageContainer, PageSection, MessageAlert, LoadingState } from '@/components/PageLayout';

export default function AddBatch() {
  const [companies, setCompanies] = useState([]);
  const [productsList, setProductsList] = useState([]);

  const [purchaseInfo, setPurchaseInfo] = useState({
    company: '',
    invoiceNo: '',
    poDate: '',
    status: 'received',
  });

  const [products, setProducts] = useState([
    { product: '', batchNo: '', invoiceRate: '', saleRate: '', quantity: '', expDate: '' },
  ]);

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
    loadProducts();
  }, []);

  const loadCompanies = async () => {
    try {
      const result = await window.electronAPI.queryDb('SELECT * FROM companies ORDER BY name');
      setCompanies(result || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setMessage({ type: 'error', text: 'Failed to load companies' });
    }
  };

  const loadProducts = async () => {
    try {
      const result = await window.electronAPI.queryDb('SELECT * FROM products ORDER BY name');
      setProductsList(result || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage({ type: 'error', text: 'Failed to load products' });
    }
  };

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

  const handleSubmit = async () => {
    setMessage(null);
    const { company, invoiceNo, poDate, status } = purchaseInfo;

    if (!company || !invoiceNo) {
      return setMessage({ type: 'error', text: 'Company and Invoice Number are required.' });
    }

    const validProducts = products.filter((p) => p.product && p.batchNo && p.quantity && p.invoiceRate && p.saleRate && p.expDate);
    if (validProducts.length === 0) {
      return setMessage({ type: 'error', text: 'Add at least one complete product with all fields filled.' });
    }

    const totalAmount = validProducts.reduce((sum, p) => sum + (parseFloat(p.invoiceRate) * parseInt(p.quantity)), 0);

    const batches = validProducts.map(p => ({
      product_id: parseInt(p.product),
      batch_no: p.batchNo,
      purchase_rate: parseFloat(p.invoiceRate),
      sale_rate: parseFloat(p.saleRate),
      quantity: parseInt(p.quantity),
      expiry_date: p.expDate
    }));

    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('add-purchase', {
        company_id: parseInt(company),
        invoice_no: invoiceNo,
        po_date: poDate || null,
        status: status || 'received',
        total_amount: totalAmount,
        batches
      });

      if (result.success) {
        setMessage({ type: 'success', text: `Batch saved successfully! Purchase ID: ${result.purchaseId}` });
        setPurchaseInfo({ company: '', invoiceNo: '', poDate: '', status: 'received' });
        setProducts([{ product: '', batchNo: '', invoiceRate: '', saleRate: '', quantity: '', expDate: '' }]);
      } else {
        setMessage({ type: 'error', text: 'Failed to save batch: ' + (result.error || 'Unknown error') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !companies.length && !productsList.length) {
    return (
      <PageContainer title="Add New Batch">
        <LoadingState message="Loading companies and products..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Add New Batch"
      description="Create a new purchase order with product batches"
      actions={
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Batch'}
        </Button>
      }
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Purchase Details */}
      <PageSection title="Purchase Details" description="Enter supplier and invoice information">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Select
              value={purchaseInfo.company}
              onValueChange={(value) => handlePurchaseSelectChange('company', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Companies</SelectLabel>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNo">Invoice Number *</Label>
            <Input
              id="invoiceNo"
              name="invoiceNo"
              value={purchaseInfo.invoiceNo}
              onChange={handlePurchaseChange}
              placeholder="e.g. INV-123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poDate">PO Date</Label>
            <Input
              id="poDate"
              type="date"
              name="poDate"
              value={purchaseInfo.poDate}
              onChange={handlePurchaseChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={purchaseInfo.status}
              onValueChange={(value) => handlePurchaseSelectChange('status', value)}
            >
              <SelectTrigger>
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
      </PageSection>

      {/* Products Table */}
      <PageSection
        title="Products in Batch"
        description="Add products and their batch information"
        actions={
          <Button onClick={addProductRow} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
        noPadding
      >
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
                <TableHead className="w-[100px]">Action</TableHead>
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
                          {productsList.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={p.batchNo}
                      onChange={(e) => handleProductChange(idx, 'batchNo', e.target.value)}
                      placeholder="Batch #"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.invoiceRate}
                      onChange={(e) => handleProductChange(idx, 'invoiceRate', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.saleRate}
                      onChange={(e) => handleProductChange(idx, 'saleRate', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={p.quantity}
                      onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={p.expDate}
                      onChange={(e) => handleProductChange(idx, 'expDate', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductRow(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageSection>
    </PageContainer>
  );
}
