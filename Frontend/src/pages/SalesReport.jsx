import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export default function SalesReport({ focusSaleId }) {
  const api = window.electronAPI;
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await api.getSales();
      setSales(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (!focusSaleId) return;
    setSelectedSaleId(focusSaleId);
  }, [focusSaleId]);

  const totalReceivable = useMemo(
    () => sales.reduce((sum, row) => sum + Number(row.net_receivable || 0), 0),
    [sales]
  );

  const handleViewDetails = async (saleInvoiceId) => {
    try {
      setDetailsLoading(true);
      const response = await api.getSaleDetails(saleInvoiceId);
      if (!response?.success) {
        alert(response?.error || 'Failed to load sale details.');
        return;
      }
      setSelectedSale(response);
      setDetailsOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to load sale details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sales Reports</h2>
          <p className="text-sm text-muted-foreground">
            Total sales: {sales.length} | Net receivable: {formatCurrency(totalReceivable)}
          </p>
        </div>
        <Button variant="outline" onClick={loadSales} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receivable</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                Loading sales…
              </TableCell>
            </TableRow>
          )}
          {!loading && sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                No sales found.
              </TableCell>
            </TableRow>
          )}
          {sales.map((sale) => (
            <TableRow
              key={sale.sale_invoice_id}
              className={sale.sale_invoice_id === selectedSaleId ? 'bg-muted/50' : ''}
            >
              <TableCell>{sale.invoice_number}</TableCell>
              <TableCell>{formatDate(sale.invoice_date)}</TableCell>
              <TableCell>{sale.customer_name}</TableCell>
              <TableCell className="capitalize">{sale.status}</TableCell>
              <TableCell>{formatCurrency(sale.net_receivable)}</TableCell>
              <TableCell>{formatCurrency(sale.amount_paid)}</TableCell>
              <TableCell>{formatCurrency(sale.balance_due)}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={detailsLoading}
                  onClick={() => handleViewDetails(sale.sale_invoice_id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Sale Details{' '}
              {selectedSale?.header?.invoice_number
                ? `- ${selectedSale.header.invoice_number}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedSale?.header && (
            <div className="space-y-3">
              <p className="text-sm">
                Customer: <span className="font-medium">{selectedSale.header.customer_name}</span>
                {' | '}Date:{' '}
                <span className="font-medium">{formatDate(selectedSale.header.invoice_date)}</span>
                {' | '}Status:{' '}
                <span className="font-medium capitalize">{selectedSale.header.status}</span>
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSale.items.map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.batch_number}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.sale_rate)}</TableCell>
                      <TableCell>{Number(item.discount_pct || 0).toFixed(2)}</TableCell>
                      <TableCell>{formatCurrency(item.tax_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-sm text-right space-y-1">
                <p>
                  Subtotal:{' '}
                  <span className="font-medium">
                    {formatCurrency(selectedSale.header.subtotal)}
                  </span>
                </p>
                <p>
                  Tax:{' '}
                  <span className="font-medium">
                    {formatCurrency(selectedSale.header.tax_amount)}
                  </span>
                </p>
                <p>
                  Net Receivable:{' '}
                  <span className="font-semibold">
                    {formatCurrency(selectedSale.header.net_receivable)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
