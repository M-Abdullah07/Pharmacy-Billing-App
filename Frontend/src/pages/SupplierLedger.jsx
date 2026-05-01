import React, { useState, useEffect } from "react";
import { BookOpen, Search, Download, Printer, Filter, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pagination } from "@/components/shared/Pagination";

export default function SupplierLedger() {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ledger View State
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPagePayables, setCurrentPagePayables] = useState(1);
  const [currentPageLedger, setCurrentPageLedger] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPayables();
  }, []);

  useEffect(() => {
    setCurrentPagePayables(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPageLedger(1);
  }, [selectedSupplier, startDate, endDate]);

  const loadPayables = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getOutstandingPayables();
      setPayables(data);
    } catch (error) {
      console.error("Failed to load payables", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    fetchLedger(supplier.supplier_id, startDate, endDate);
  };

  const fetchLedger = async (supplierId, start, end) => {
    try {
      setLedgerLoading(true);
      const data = await window.electronAPI.getSupplierLedger(supplierId, start, end);
      setLedgerEntries(data);
    } catch (error) {
      console.error("Failed to fetch ledger", error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleFilterLedger = () => {
    if (selectedSupplier) {
      fetchLedger(selectedSupplier.supplier_id, startDate, endDate);
    }
  };

  const calculateRunningBalance = (entries) => {
    // In our simplified ledger, credit increases payable (purchase), debit decreases (payment/return)
    let balance = 0;
    return entries.map(entry => {
      const cr = Number(entry.credit) || 0;
      const dr = Number(entry.debit) || 0;
      balance = balance + cr - dr;
      return { ...entry, running_balance: balance };
    });
  };

  const filteredPayables = payables.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalOutstanding = payables.reduce((sum, p) => sum + Number(p.payable_balance), 0);

  const handleExportPayablesCSV = () => {
    const headers = ["Supplier", "City", "Payment Terms", "Outstanding Payable"];
    const rows = filteredPayables.map(p => [
      `"${p.name}"`,
      `"${p.city || ''}"`,
      `"${p.payment_terms || ''}"`,
      p.payable_balance
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "outstanding_payables.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportLedgerCSV = () => {
    if (!selectedSupplier || ledgerEntries.length === 0) return;
    
    const headers = ["Date", "Type", "Reference", "Notes", "Credit (Buy)", "Debit (Pay/Ret)", "Balance"];
    const rows = calculateRunningBalance(ledgerEntries).map(e => [
      formatDate(e.date),
      e.type,
      `"${e.reference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.credit,
      e.debit,
      e.running_balance
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedSupplier.name.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 h-full w-full max-w-7xl mx-auto flex flex-col bg-gray-50/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" />
            Supplier Ledger & Payables
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track outstanding balances and running accounts.</p>
        </div>
        {!selectedSupplier && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
             <span className="text-sm font-medium text-gray-500 px-2">Total Outstanding:</span>
             <span className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</span>
          </div>
        )}
      </div>

      {!selectedSupplier ? (
        /* Payables Dashboard */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-4 bg-gray-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button onClick={handleExportPayablesCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
              <Download size={16} /> Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium">City</th>
                  <th className="px-6 py-4 font-medium">Payment Terms</th>
                  <th className="px-6 py-4 font-medium text-right">Outstanding Payable</th>
                  <th className="px-6 py-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-8">Loading...</td></tr>
                ) : filteredPayables.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-400">No outstanding payables found.</td></tr>
                ) : (
                  filteredPayables.slice((currentPagePayables - 1) * itemsPerPage, currentPagePayables * itemsPerPage).map(supplier => (
                    <tr key={supplier.supplier_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                      <td className="px-6 py-4">{supplier.city || '-'}</td>
                      <td className="px-6 py-4">
                        {supplier.payment_terms || 'N/A'} 
                        {supplier.credit_period_days > 0 && ` (${supplier.credit_period_days} days)`}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">
                        {formatCurrency(supplier.payable_balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleViewLedger(supplier)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
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
              totalItems={filteredPayables.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPagePayables}
              onPageChange={setCurrentPagePayables}
            />
          </div>
        </div>
      ) : (
        /* Ledger Detail View */
        <div className="flex flex-col flex-1 h-full min-h-0 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-indigo-50 flex items-center justify-between">
            <div>
              <button 
                onClick={() => setSelectedSupplier(null)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-1 flex items-center gap-1"
              >
                ← Back to Payables
              </button>
              <h2 className="text-xl font-bold text-indigo-900">{selectedSupplier.name}</h2>
              <p className="text-indigo-700 text-sm font-medium">Current Payable: {formatCurrency(selectedSupplier.payable_balance)}</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm border-none focus:ring-0 p-0 text-gray-600" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm border-none focus:ring-0 p-0 text-gray-600" />
                  <button onClick={handleFilterLedger} className="ml-2 text-indigo-600 hover:text-indigo-800">
                    <Filter size={16} />
                  </button>
               </div>
               <button onClick={handleExportLedgerCSV} className="p-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-600" title="Export CSV">
                 <Download size={18} />
               </button>
               <button onClick={handlePrint} className="p-2 border rounded-lg bg-white hover:bg-gray-50 text-gray-600" title="Print Ledger">
                 <Printer size={18} />
               </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  <th className="px-6 py-3 font-medium text-right text-red-600">Credit (Buy)</th>
                  <th className="px-6 py-3 font-medium text-right text-green-600">Debit (Pay/Ret)</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledgerLoading ? (
                  <tr><td colSpan="7" className="text-center py-8">Loading Ledger...</td></tr>
                ) : ledgerEntries.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-gray-400">No ledger entries found in this period.</td></tr>
                ) : (
                  calculateRunningBalance(ledgerEntries)
                    .slice((currentPageLedger - 1) * itemsPerPage, currentPageLedger * itemsPerPage)
                    .map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          entry.type === 'Purchase' ? 'bg-red-100 text-red-700' :
                          entry.type === 'Payment' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{entry.reference || '-'}</td>
                      <td className="px-6 py-3 truncate max-w-[200px]" title={entry.notes}>{entry.notes || '-'}</td>
                      <td className="px-6 py-3 text-right text-red-600">{Number(entry.credit) > 0 ? formatCurrency(entry.credit) : '-'}</td>
                      <td className="px-6 py-3 text-right text-green-600">{Number(entry.debit) > 0 ? formatCurrency(entry.debit) : '-'}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(entry.running_balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-white">
            <Pagination 
              totalItems={ledgerEntries.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPageLedger}
              onPageChange={setCurrentPageLedger}
            />
          </div>
        </div>
      )}
    </div>
  );
}
