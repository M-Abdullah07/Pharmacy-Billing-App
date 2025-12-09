import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, DollarSign } from 'lucide-react';
import { PageContainer, PageSection, LoadingState, EmptyState } from '@/components/PageLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomerLedger() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerTransactions();
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.getCustomers();
      setCustomers(result || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerTransactions = async () => {
    try {
      setIsLoading(true);

      // Get sales for this customer
      const salesResult = await window.electronAPI.queryDb(
        'SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC',
        [selectedCustomer]
      );
      setTransactions(salesResult || []);

      // Get credit payments for this customer
      const paymentsResult = await window.electron.ipcRenderer.invoke(
        'get-credit-payments',
        selectedCustomer
      );
      setPayments(paymentsResult || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCustomerData = customers.find(c => c.id === parseInt(selectedCustomer));

  const filteredTransactions = transactions.filter(t =>
    t.id.toString().includes(search) ||
    t.total_amount.toString().includes(search)
  );

  const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const balance = selectedCustomerData?.credit_amount || 0;

  return (
    <PageContainer
      title="Customer Ledger"
      description="View customer transaction history and balances"
    >
      {/* Customer Selection */}
      <PageSection
        title="Select Customer"
        description="Choose a customer to view their ledger"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomerData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">Rs. {totalSales.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold text-green-600">Rs. {totalPayments.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">Rs. {balance.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </PageSection>

      {selectedCustomer && (
        <>
          {/* Sales Transactions */}
          <PageSection
            title={`Sales Transactions (${filteredTransactions.length})`}
            description="All sales made to this customer"
            noPadding
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <LoadingState message="Loading transactions..." />
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No transactions found"
                description="This customer has no sales transactions yet"
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">#{transaction.id}</TableCell>
                        <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>Rs. {parseFloat(transaction.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${transaction.is_credit ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                            {transaction.is_credit ? 'Credit' : 'Cash'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.is_credit ? (
                            <span className="text-orange-600">Pending</span>
                          ) : (
                            <span className="text-green-600">Paid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageSection>

          {/* Payment History */}
          <PageSection
            title={`Payment History (${payments.length})`}
            description="Credit payments received from this customer"
            noPadding
          >
            {isLoading ? (
              <LoadingState message="Loading payments..." />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No payments found"
                description="This customer has no payment history yet"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.id}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-green-600 font-medium">Rs. {parseFloat(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>{payment.notes || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageSection>
        </>
      )}
    </PageContainer>
  );
}
