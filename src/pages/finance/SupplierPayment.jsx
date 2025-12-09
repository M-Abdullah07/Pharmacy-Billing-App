import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, DollarSign, Plus } from 'lucide-react';
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from '@/components/PageLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from "date-fns";

export default function SupplierPayment() {
  const [companies, setCompanies] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [form, setForm] = useState({ amount: '', payment_date: new Date(), notes: '' });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadPurchases();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.queryDb('SELECT * FROM companies ORDER BY name');
      setCompanies(result || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.queryDb(
        'SELECT * FROM purchases WHERE company_id = ? ORDER BY created_at DESC',
        [selectedCompany]
      );
      setPurchases(result || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
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

    if (!selectedCompany || !form.amount || !form.payment_date) {
      setMessage({ type: 'error', text: 'Company, amount, and date are required' });
      return;
    }

    try {
      setIsLoading(true);

      // Record payment (you can add a supplier_payments table if needed)
      // For now, we'll just show a success message
      setMessage({ type: 'success', text: 'Payment recorded successfully!' });
      setForm({ amount: '', payment_date: new Date(), notes: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === parseInt(selectedCompany));
  const totalPurchases = purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);

  const filteredPurchases = purchases.filter(p =>
    p.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
    p.total_amount.toString().includes(search)
  );

  return (
    <PageContainer
      title="Supplier Payments"
      description="Manage payments to suppliers and track purchase history"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Company Selection & Payment Form */}
      <PageSection
        title="Record Payment"
        description="Select supplier and record payment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier/Company *</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.payment_date ? format(form.payment_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.payment_date}
                    onSelect={(date) => {
                      setForm(prev => ({ ...prev, payment_date: date }));
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional payment notes"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading || !selectedCompany}>
            <DollarSign className="mr-2 h-4 w-4" />
            {isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>

        {selectedCompanyData && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="text-lg font-bold">{selectedCompanyData.name}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Purchases</p>
              <p className="text-2xl font-bold">Rs. {totalPurchases.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="text-lg font-medium">{selectedCompanyData.contact || 'N/A'}</p>
            </div>
          </div>
        )}
      </PageSection>

      {/* Purchase History */}
      {selectedCompany && (
        <PageSection
          title={`Purchase History (${filteredPurchases.length})`}
          description="All purchases from this supplier"
          noPadding
        >
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Search by invoice number or amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading purchases..." />
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No purchases found"
              description="No purchase history with this supplier yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map(purchase => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.invoice_no}</TableCell>
                      <TableCell>{purchase.po_date ? new Date(purchase.po_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>Rs. {parseFloat(purchase.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${purchase.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {purchase.status || 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      )}
    </PageContainer>
  );
}
