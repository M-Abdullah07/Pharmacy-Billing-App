import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Download, Printer, Filter, Calendar, Wallet } from 'lucide-react';
import { facade } from '@/core/facade/createFacade';
import Toast from '@/components/shared/Toast';
import { Pagination } from '@/components/shared/Pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getUserId } from '@/utilis/sessions';

export default function CreditDues() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Ledger View State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Form State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  // Pagination
  const [currentPageCustomers, setCurrentPageCustomers] = useState(1);
  const [currentPageLedger, setCurrentPageLedger] = useState(1);
  const itemsPerPage = 10;

  const showToast = (message, type) => setToast({ message, type });

  const loadReceivables = async () => {
    try {
      setLoading(true);
      const data = await facade.route('getOutstandingReceivables');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load credit dues: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  useEffect(() => {
    setCurrentPageCustomers(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPageLedger(1);
  }, [selectedCustomer, startDate, endDate]);

  const handleViewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setShowPayment(false);
    fetchLedger(customer.customer_id, startDate, endDate);
  };

  const fetchLedger = async (customerId, start, end) => {
    try {
      setLedgerLoading(true);
      const data = await facade.route('getCustomerLedger', customerId, start, end);
      // get-customer-ledger returns { openingBalance, entries } (M30). Fall back to the
      // old bare-array shape defensively in case a stale build of the handler responds.
      if (Array.isArray(data)) {
        setLedgerEntries(data);
        setLedgerOpeningBalance(0);
      } else {
        setLedgerEntries(Array.isArray(data?.entries) ? data.entries : []);
        setLedgerOpeningBalance(Number(data?.openingBalance) || 0);
      }
    } catch (error) {
      showToast('Failed to fetch ledger: ' + error.message, 'error');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleFilterLedger = () => {
    if (selectedCustomer) {
      fetchLedger(selectedCustomer.customer_id, startDate, endDate);
    }
  };

  const calculateRunningBalance = (entries) => {
    // For customers, debit increases receivable (Sale), credit decreases (Payment/Return).
    // Seed with the opening balance (M30) so the running total reflects history before
    // the filtered date range instead of silently starting at zero.
    let balance = ledgerOpeningBalance;
    return entries.map((entry) => {
      const cr = Number(entry.credit) || 0;
      const dr = Number(entry.debit) || 0;
      balance = balance + dr - cr;
      return { ...entry, running_balance: balance };
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.territory && c.territory.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstanding_balance), 0);

  const handleExportCustomersCSV = () => {
    const headers = ['Customer', 'Territory', 'Bucket 0-30', 'Bucket 31-60', 'Bucket 61-90', '90+ Days', 'Outstanding Balance'];
    const rows = filteredCustomers.map((c) => [
      `"${c.customer_name}"`,
      `"${c.territory || ''}"`,
      c.bucket_0_30,
      c.bucket_31_60,
      c.bucket_61_90,
      c.bucket_90_plus,
      c.outstanding_balance,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'credit_dues.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportLedgerCSV = () => {
    if (!selectedCustomer || ledgerEntries.length === 0) return;

    const headers = [
      'Date',
      'Type',
      'Reference',
      'Notes',
      'Debit (Sale)',
      'Credit (Pay/Ret)',
      'Balance',
    ];
    const rows = calculateRunningBalance(ledgerEntries).map((e) => [
      formatDate(e.date),
      e.type,
      `"${e.reference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.running_balance,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedCustomer.customer_name.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setPayError('Please enter a valid amount.');
      return;
    }
    const maxAmount = Number(selectedCustomer.outstanding_balance);
    if (Number(paymentAmount) > maxAmount) {
      setPayError(`Amount cannot exceed total balance (${formatCurrency(maxAmount)}).`);
      return;
    }

    setIsSubmitting(true);
    setPayError('');
    try {
      const userId = getUserId();
      
      const res = await facade.route('recordCustomerPayment', {
        customerId: selectedCustomer.customer_id,
        amount: Number(paymentAmount),
        paymentMode,
        referenceNo: 'Lump Sum Payment',
        notes: paymentNotes,
        userId
      });

      if (res.success) {
        showToast('Payment recorded successfully!', 'success');
        setShowPayment(false);
        setPaymentAmount('');
        setPaymentNotes('');
        
        // Refresh everything
        await loadReceivables();
        fetchLedger(selectedCustomer.customer_id, startDate, endDate);
        
        // Update the selected customer's outstanding balance locally so UI updates immediately
        setSelectedCustomer(prev => ({
          ...prev,
          outstanding_balance: Number(prev.outstanding_balance) - Number(paymentAmount)
        }));
      } else {
        setPayError(res.error || 'Failed to record payment');
      }
    } catch (err) {
      setPayError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 h-full w-full max-w-7xl mx-auto flex flex-col bg-gray-50/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            Customer Ledger & Credit Dues
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track customer outstanding balances and record payments.
          </p>
        </div>
        {!selectedCustomer && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
            <span className="text-sm font-medium text-gray-500 px-2">Total Market AR:</span>
            <span className="text-xl font-bold text-amber-600">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
        )}
      </div>

      {!selectedCustomer ? (
        /* Customers Dashboard */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <button
              onClick={handleExportCustomersCSV}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Territory</th>
                  <th className="px-6 py-4 font-medium text-center">0-30 Days</th>
                  <th className="px-6 py-4 font-medium text-center">90+ Days</th>
                  <th className="px-6 py-4 font-medium text-right">Outstanding Dues</th>
                  <th className="px-6 py-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      Loading...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      No credit dues found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers
                    .slice(
                      (currentPageCustomers - 1) * itemsPerPage,
                      currentPageCustomers * itemsPerPage
                    )
                    .map((customer) => (
                      <tr key={customer.customer_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{customer.customer_name}</td>
                        <td className="px-6 py-4">{customer.territory || '-'}</td>
                        <td className="px-6 py-4 text-center text-gray-500">
                          {Number(customer.bucket_0_30) > 0 ? formatCurrency(customer.bucket_0_30) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-red-500 font-medium">
                          {Number(customer.bucket_90_plus) > 0 ? formatCurrency(customer.bucket_90_plus) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-amber-600">
                          {formatCurrency(customer.outstanding_balance)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewLedger(customer)}
                            className="text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-white">
            <Pagination
              totalItems={filteredCustomers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPageCustomers}
              onPageChange={setCurrentPageCustomers}
            />
          </div>
        </div>
      ) : (
        /* Ledger Detail View */
        <div className="flex flex-col flex-1 h-full min-h-0 bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
            <div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-1 flex items-center gap-1 transition-colors"
              >
                ← Back to Credit Dues
              </button>
              <h2 className="text-xl font-bold text-blue-900">{selectedCustomer.customer_name}</h2>
              <p className="text-blue-700 text-sm font-medium mt-0.5">
                Outstanding Balance: {formatCurrency(selectedCustomer.outstanding_balance)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!showPayment && Number(selectedCustomer.outstanding_balance) > 0 && (
                <button
                  onClick={() => {
                    setPaymentAmount(selectedCustomer.outstanding_balance);
                    setShowPayment(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm mr-2"
                >
                  <Wallet size={16} />
                  Receive Payment
                </button>
              )}
              
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm border-none focus:ring-0 p-0 text-gray-600 outline-none"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm border-none focus:ring-0 p-0 text-gray-600 outline-none"
                />
                <button
                  onClick={handleFilterLedger}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <Filter size={16} />
                </button>
              </div>
              <button
                onClick={handleExportLedgerCSV}
                className="p-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors"
                title="Export CSV"
              >
                <Download size={18} />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors"
                title="Print Ledger"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>

          {/* Payment Form Expansion */}
          {showPayment && (
            <div className="bg-gray-50 border-b border-gray-200 p-4 shrink-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-800">Record General Payment</h3>
                <button onClick={() => setShowPayment(false)} className="text-xs text-gray-500 hover:text-gray-800 font-medium">Close Form</button>
              </div>
              
              <div className="flex gap-4">
                <div className="w-1/4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.)</label>
                  <input
                    type="number"
                    min="1"
                    max={Number(selectedCustomer.outstanding_balance)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                  />
                </div>
                <div className="w-1/4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional details"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500 italic">
                  * This payment will automatically be applied to the oldest unpaid invoices.
                </p>
                <div className="flex items-center gap-3">
                  {payError && <span className="text-xs text-red-600 font-medium">{payError}</span>}
                  <button
                    onClick={handleRecordPayment}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  <th className="px-6 py-3 font-medium text-right text-amber-600">Debit (Sale)</th>
                  <th className="px-6 py-3 font-medium text-right text-green-600">Credit (Pay/Ret)</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!ledgerLoading && ledgerOpeningBalance !== 0 && (
                  <tr className="bg-gray-50/70 italic text-gray-500">
                    <td className="px-6 py-2" colSpan="6">Opening Balance (before selected period)</td>
                    <td className="px-6 py-2 text-right font-semibold">{formatCurrency(ledgerOpeningBalance)}</td>
                  </tr>
                )}
                {ledgerLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      Loading Ledger...
                    </td>
                  </tr>
                ) : ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">
                      No ledger entries found in this period.
                    </td>
                  </tr>
                ) : (
                  calculateRunningBalance(ledgerEntries)
                    .slice((currentPageLedger - 1) * itemsPerPage, currentPageLedger * itemsPerPage)
                    .map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-gray-900">{formatDate(entry.date)}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              entry.type === 'Sale'
                                ? 'bg-amber-100 text-amber-700'
                                : entry.type === 'Payment'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs">{entry.reference || '-'}</td>
                        <td className="px-6 py-3 truncate max-w-[200px]" title={entry.notes}>
                          {entry.notes || '-'}
                        </td>
                        <td className="px-6 py-3 text-right text-amber-600 font-medium">
                          {Number(entry.debit) > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-6 py-3 text-right text-green-600 font-medium">
                          {Number(entry.credit) > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(entry.running_balance)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-white shrink-0">
            <Pagination
              totalItems={ledgerEntries.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPageLedger}
              onPageChange={setCurrentPageLedger}
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
