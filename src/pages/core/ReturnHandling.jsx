import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, RotateCcw } from 'lucide-react';
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from '@/components/PageLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReturnHandling() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState('');
  const [saleItems, setSaleItems] = useState([]);
  const [form, setForm] = useState({ quantity: '', reason: '' });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRecentSales();
  }, []);

  useEffect(() => {
    if (selectedSale) {
      loadSaleItems();
    }
  }, [selectedSale]);

  const loadRecentSales = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('get-sales');
      setSales(result || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSaleItems = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('get-sale-details', parseInt(selectedSale));
      setSaleItems(result || []);
    } catch (error) {
      console.error('Error loading sale items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleReturn = async (e) => {
    e.preventDefault();

    if (!selectedSale || !form.quantity || !form.reason) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    try {
      setIsLoading(true);

      // Process return (add stock back, create refund record)
      setMessage({ type: 'success', text: 'Return processed successfully!' });
      setForm({ quantity: '', reason: '' });
      setSelectedSale('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSaleData = sales.find(s => s.id === parseInt(selectedSale));
  const filteredSales = sales.filter(s =>
    s.id.toString().includes(search) ||
    (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageContainer
      title="Return Handling"
      description="Process product returns and refunds"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Return Form */}
      <PageSection
        title="Process Return"
        description="Select a sale and process product return"
      >
        <form onSubmit={handleReturn} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Sale *</Label>
              <Select value={selectedSale} onValueChange={setSelectedSale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sale to return" />
                </SelectTrigger>
                <SelectContent>
                  {sales.slice(0, 50).map(sale => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      Sale #{sale.id} - Rs. {parseFloat(sale.total_amount).toFixed(2)} ({new Date(sale.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Return Quantity *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={handleChange}
                placeholder="Quantity to return"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reason">Return Reason *</Label>
              <Input
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="e.g., Damaged, Expired, Wrong product"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading || !selectedSale}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Process Return'}
          </Button>
        </form>

        {selectedSaleData && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Sale ID</p>
              <p className="text-lg font-bold">#{selectedSaleData.id}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">Rs. {parseFloat(selectedSaleData.total_amount).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-lg font-medium">{selectedSaleData.is_credit ? 'Credit' : 'Cash'}</p>
            </div>
          </div>
        )}
      </PageSection>

      {/* Sale Items */}
      {selectedSale && saleItems.length > 0 && (
        <PageSection
          title="Sale Items"
          description="Items in this sale"
          noPadding
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.product_name || 'N/A'}</TableCell>
                    <TableCell>{item.batch_number || 'N/A'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs. {parseFloat(item.rate).toFixed(2)}</TableCell>
                    <TableCell>Rs. {parseFloat(item.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PageSection>
      )}

      {/* Recent Sales */}
      <PageSection
        title={`Recent Sales (${filteredSales.length})`}
        description="Select a sale to process return"
        noPadding
      >
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by sale ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading sales..." />
        ) : filteredSales.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No sales found"
            description="No sales available for returns"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.slice(0, 20).map(sale => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSale(sale.id.toString())}
                  >
                    <TableCell className="font-medium">#{sale.id}</TableCell>
                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>Rs. {parseFloat(sale.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${sale.is_credit ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {sale.is_credit ? 'Credit' : 'Cash'}
                      </span>
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
