import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Plus, Trash2, CheckCircle2, FileText, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate, validateQuantity } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { Pagination } from '@/components/shared/Pagination';

export default function PurchaseReturns() {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [reason, setReason] = useState('other');
  const [notes, setNotes] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invs, supps, rets] = await Promise.all([
        window.electronAPI.getPurchaseInvoices(),
        window.electronAPI.getSuppliers(),
        window.electronAPI.getPurchaseReturns(),
      ]);
      setInvoices(invs.filter((i) => i.status === 'confirmed'));
      setSuppliers(supps);
      setReturns(rets);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = async (e) => {
    const invoiceId = e.target.value;
    if (!invoiceId) {
      setSelectedInvoice(null);
      setInvoiceItems([]);
      setReturnItems([]);
      return;
    }

    try {
      const data = await window.electronAPI.getPurchaseInvoice(invoiceId);
      if (data && data.header) {
        setSelectedInvoice(data.header);

        // Drive from purchase_invoice_items — this is guaranteed to have a row
        // for every line on a confirmed invoice. Join batches for live stock qty.
        const rows = await window.electronAPI.getPurchaseReturnItems(invoiceId);

        // Cap returnable qty: you can never return more than was invoiced,
        // and never more than what is physically still in stock.
        const mappedItems = rows.map((b) => {
          const discountMultiplier = 1 - b.discount_pct / 100;
          const netCostPerUnit = b.purchase_cost_per_unit * discountMultiplier;
          const maxReturnable = Math.min(Number(b.invoiced_qty), Number(b.quantity_available));

          return {
            item_id: b.batch_id,
            batch_id: b.batch_id,
            product_id: b.product_id,
            product_name: b.product_name,
            batch_number: b.batch_number,
            quantity: maxReturnable,
            purchase_cost_per_unit: b.purchase_cost_per_unit,
            net_unit_cost: netCostPerUnit,
            discount_pct: b.discount_pct,
            gst_rate: b.gst_rate,
          };
        });

        setInvoiceItems(mappedItems);
        setReturnItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch invoice details', error);
    }
  };

  const handleAddReturnItem = (item) => {
    if (returnItems.find((i) => i.item_id === item.item_id)) return;

    setReturnItems([
      ...returnItems,
      {
        ...item,
        return_quantity: 1,
        line_credit: item.net_unit_cost,
      },
    ]);
  };

  const handleRemoveReturnItem = (itemId) => {
    setReturnItems(returnItems.filter((i) => i.item_id !== itemId));
  };

  const handleQuantityChange = (itemId, qty, maxQty, rate) => {
    const parsedQty = parseInt(qty, 10);
    const validQty = isNaN(parsedQty) ? '' : Math.max(1, Math.min(parsedQty, maxQty));

    setReturnItems(
      returnItems.map((item) => {
        if (item.item_id === itemId) {
          return {
            ...item,
            return_quantity: validQty,
            line_credit: (validQty || 0) * rate,
          };
        }
        return item;
      })
    );
  };

  const totalCredit = returnItems.reduce((sum, item) => sum + item.line_credit, 0);

  const handleSubmitReturn = async () => {
    if (!selectedInvoice || returnItems.length === 0) return;

    try {
      const userStr = localStorage.getItem('pharmax_user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        purchase_invoice_id: selectedInvoice.purchase_invoice_id,
        supplier_id: selectedInvoice.supplier_id,
        return_date: new Date().toISOString().split('T')[0],
        reason,
        notes,
        total_credit: totalCredit,
        user_id: user?.user_id,
        items: returnItems.map((item) => ({
          batch_id: item.batch_id,
          quantity: item.return_quantity,
          credit_rate: item.net_unit_cost,
          line_credit: item.line_credit,
        })),
      };

      const res = await window.electronAPI.addPurchaseReturn(payload);
      if (res.success) {
        setConfirmOpen(false);
        setIsFormOpen(false);
        setSelectedInvoice(null);
        setReturnItems([]);
        loadData();
      } else {
        alert('Failed to submit return: ' + res.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error submitting return');
    }
  };

  return (
    <div className="p-6 h-full w-full max-w-7xl mx-auto flex flex-col bg-gray-50/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="text-blue-600" />
            Purchase Returns
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage goods returned to suppliers and credit notes.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          {isFormOpen ? <Search size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'View History' : 'New Return'}
        </button>
      </div>

      {isFormOpen ? (
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full overflow-hidden">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Purchase Invoice
              </label>
              <div className="relative">
                <select
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={selectedInvoice?.purchase_invoice_id || ''}
                  onChange={handleSelectInvoice}
                >
                  <option value="">-- Select an invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.purchase_invoice_id} value={inv.purchase_invoice_id}>
                      {inv.invoice_number} - {inv.supplier_name} ({formatDate(inv.received_date)})
                    </option>
                  ))}
                </select>
                <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                <ChevronDown
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>
            </div>

            {selectedInvoice && (
              <div className="flex flex-col justify-end">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                      Supplier
                    </p>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedInvoice.supplier_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                      Invoice Total
                    </p>
                    <p className="text-sm font-medium text-blue-900">
                      {formatCurrency(selectedInvoice.net_payable)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedInvoice && (
            <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
              {/* Available Items */}
              <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-gray-50">
                <div className="p-3 bg-gray-100 border-b font-medium text-sm text-gray-700">
                  Available Items in Invoice
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {invoiceItems.map((item) => (
                    <div
                      key={item.item_id}
                      className="bg-white p-3 rounded border shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-500">
                          Batch: {item.batch_number} | Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-semibold text-blue-600 mt-1">
                          {formatCurrency(item.net_unit_cost)} / unit
                          {item.discount_pct > 0 && (
                            <span className="text-gray-400 font-normal ml-1">
                              (after {item.discount_pct}% discount, tax excluded)
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddReturnItem(item)}
                        disabled={!!returnItems.find((i) => i.item_id === item.item_id)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Return Items */}
              <div className="flex-[1.5] flex flex-col border rounded-lg overflow-hidden bg-white">
                <div className="p-3 bg-blue-600 text-white font-medium text-sm border-b flex justify-between items-center">
                  <span>Return Items</span>
                  <span className="bg-blue-700 px-2 py-0.5 rounded text-xs">
                    {returnItems.length} selected
                  </span>
                </div>

                <div className="overflow-y-auto flex-1 p-3">
                  {returnItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <RotateCcw size={48} className="mb-2 opacity-20" />
                      <p className="text-sm">Add items from the invoice to return</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase border-b">
                        <tr>
                          <th className="pb-2 font-medium">Product / Batch</th>
                          <th className="pb-2 font-medium">Rate</th>
                          <th className="pb-2 font-medium w-24">Return Qty</th>
                          <th className="pb-2 font-medium text-right">Credit</th>
                          <th className="pb-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {returnItems.map((item) => (
                          <tr key={item.item_id}>
                            <td className="py-3">
                              <div className="font-medium text-gray-900">{item.product_name}</div>
                              <div className="text-xs text-gray-500">
                                {item.batch_number} (Max: {item.quantity})
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(item.net_unit_cost)}
                              </div>
                              {item.discount_pct > 0 && (
                                <div className="text-[10px] text-gray-500">
                                  (-{item.discount_pct}%)
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={item.return_quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.item_id,
                                    e.target.value,
                                    item.quantity,
                                    item.net_unit_cost
                                  )
                                }
                                className="w-20 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 text-right font-medium text-gray-900">
                              {formatCurrency(item.line_credit)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleRemoveReturnItem(item.item_id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer Totals & Submit */}
                <div className="bg-gray-50 p-4 border-t mt-auto">
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reason for Return
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
                      >
                        <option value="near_expiry">Near Expiry</option>
                        <option value="damaged">Damaged</option>
                        <option value="excess_stock">Excess Stock</option>
                        <option value="wrong_product">Wrong Product</option>
                        <option value="quality_issue">Quality Issue</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
                        placeholder="Optional remarks..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-gray-600 font-medium">Total Credit Note</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalCredit)}
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={returnItems.length === 0}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={18} />
                    Confirm Return & Update Ledger
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History View */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Return Date</th>
                  <th className="px-6 py-4 font-medium">Purchase Invoice</th>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium text-right">Total Credit</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      Loading...
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      No return records found.
                    </td>
                  </tr>
                ) : (
                  returns
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((ret) => (
                      <tr key={ret.return_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(ret.return_date)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {ret.purchase_invoice_number}
                        </td>
                        <td className="px-6 py-4">{ret.supplier_name}</td>
                        <td className="px-6 py-4 capitalize">{ret.reason.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(ret.total_credit)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {ret.status}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            totalItems={returns.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Purchase Return"
        message={`Are you sure you want to process this return? \n\nTotal Credit: ${formatCurrency(totalCredit)}\n\nThis will permanently deduct stock and update the supplier's payable ledger.`}
        onConfirm={handleSubmitReturn}
        onClose={() => setConfirmOpen(false)}
        confirmText="Yes, Process Return"
        type="primary"
      />
    </div>
  );
}
