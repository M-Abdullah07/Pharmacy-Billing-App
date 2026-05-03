import Toast from '../components/shared/Toast';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getUserId } from '@/utilis/sessions';
import { Pagination } from '@/components/shared/Pagination';
import { facade } from '@/core/facade/createFacade';
import { calcLine, calcTotals } from '@/features/purchaseInvoice/purchaseInvoiceDto';
import { EMPTY_HEADER, EMPTY_LINE, formatCurrencyPKR, validatePurchaseDraft } from './purchaseinvoice/model';
import { GRNDetail, LineItem, StatusBadge } from './purchaseinvoice/components';

// ── Main Component ────────────────────────────────────────────────────────────
export default function PurchaseInvoice() {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('draft');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [lineErrors, setLineErrors] = useState([]);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [invs, sups, prods] = await Promise.all([
        facade.route('getPurchaseInvoices'),
        facade.route('getSuppliers'),
        facade.route('getProducts'),
      ]);
      setInvoices(Array.isArray(invs) ? invs : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // ── Line management ─────────────────────────────────────────────────────────
  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, changes) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...changes } : l)));

  // ── Live totals ─────────────────────────────────────────────────────────────
  const totals = calcTotals(lines, header.discount_amount);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const { headerErrors: hErrors, lineErrors: lErrors } = validatePurchaseDraft(header, lines);
    setHeaderErrors(hErrors);
    setLineErrors(lErrors);
    return Object.keys(hErrors).length === 0 && lErrors.every((e) => Object.keys(e).length === 0);
  };

  // ── Save as draft ───────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // 1. Create invoice header
      const invoiceResult = await facade.route('addPurchaseInvoice', { header, lines });

      if (!invoiceResult.success) {
        if (invoiceResult.error?.includes('already exists'))
          setHeaderErrors((prev) => ({ ...prev, invoice_number: invoiceResult.error }));
        else showToast(invoiceResult.error || 'Failed to save GRN.', 'error');
        return;
      }

      const invoiceId = invoiceResult.purchaseInvoiceId;

      // 2. Save all line items (all are new batches — no existing batch mode)
      for (const line of lines) {
        const lineCalc = calcLine(line);
        await facade.route('addPurchaseInvoiceItem', {
          purchase_invoice_id: invoiceId,
          product_id: line.product_id,
          batch_number: line.batch_number,
          manufacturing_date: line.manufacturing_date,
          expiry_date: line.expiry_date,
          mrp: Number(line.mrp),
          purchase_cost_per_unit: Number(line.purchase_cost_per_unit),
          quantity: Number(line.quantity),
          discount_pct: Number(line.discount_pct) || 0,
          gst_rate: Number(line.gst_rate) || 0,
          line_total: lineCalc.base,
          tax_amount: lineCalc.tax,
        });
      }

      showToast('GRN saved as draft successfully.', 'success');
      setShowForm(false);
      resetForm();
      await loadAll();
    } catch (err) {
      showToast('Service unavailable. Contact administrator.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm GRN ─────────────────────────────────────────────────────────────
  const handleConfirm = async (invoiceId) => {
    if (
      !window.confirm(
        'Confirm this GRN? Stock will be updated and supplier payable will increase. This cannot be undone.'
      )
    )
      return;
    try {
      const userId = getUserId();
      if (!userId) {
        showToast('Please login first.', 'error');
        return;
      }
      const result = await facade.route('confirmPurchaseInvoice', invoiceId, userId);
      if (result.success) {
        showToast('GRN confirmed. Stock and supplier ledger updated.', 'success');
        await loadAll();
      } else {
        showToast(result.error || 'Failed to confirm GRN.', 'error');
      }
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  // ── Cancel GRN ──────────────────────────────────────────────────────────────
  const handleCancel = async (invoiceId) => {
    if (!window.confirm('Cancel this GRN? This action cannot be undone.')) return;
    try {
      const result = await facade.route('cancelPurchaseInvoice', invoiceId);
      if (result.success) {
        showToast('GRN cancelled.', 'success');
        await loadAll();
      } else {
        showToast(result.error || 'Failed to cancel GRN.', 'error');
      }
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  const resetForm = () => {
    setHeader(EMPTY_HEADER);
    setLines([{ ...EMPTY_LINE }]);
    setHeaderErrors({});
    setLineErrors([]);
  };

  const showToast = (message, type) => setToast({ message, type });

  const hField = (key, value) => {
    setHeader((prev) => ({ ...prev, [key]: value }));
    if (headerErrors[key]) setHeaderErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const inputCls = (err) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
     ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const selectCls = (err) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer transition-all
     ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      inv.invoice_number?.toLowerCase().includes(q) || inv.supplier_name?.toLowerCase().includes(q);
    return matchSearch && inv.status === activeTab;
  });

  const counts = {
    draft: invoices.filter((i) => i.status === 'draft').length,
    confirmed: invoices.filter((i) => i.status === 'confirmed').length,
    cancelled: invoices.filter((i) => i.status === 'cancelled').length,
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Purchase Invoices (GRN)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Record incoming stock and manage supplier payables
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} /> New GRN
          </button>
        )}
      </div>

      {/* ── GRN Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* Form header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">New Purchase Invoice / GRN</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fill in supplier and line items. Save as draft to review before confirming.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Invoice Header */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={header.supplier_id}
                onChange={(e) => hField('supplier_id', e.target.value)}
                className={selectCls(headerErrors.supplier_id)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {headerErrors.supplier_id && (
                <p className="text-red-500 text-xs mt-1">{headerErrors.supplier_id}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Supplier Invoice No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={header.invoice_number}
                onChange={(e) => hField('invoice_number', e.target.value)}
                placeholder="e.g. SUP-INV-2024-001"
                className={inputCls(headerErrors.invoice_number)}
              />
              {headerErrors.invoice_number && (
                <p className="text-red-500 text-xs mt-1">{headerErrors.invoice_number}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={header.invoice_date}
                onChange={(e) => hField('invoice_date', e.target.value)}
                className={inputCls(headerErrors.invoice_date)}
              />
              {headerErrors.invoice_date && (
                <p className="text-red-500 text-xs mt-1">{headerErrors.invoice_date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Received Date</label>
              <input
                type="date"
                value={header.received_date}
                onChange={(e) => hField('received_date', e.target.value)}
                className={inputCls(false)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Product Lines</h3>
              <button
                onClick={addLine}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={13} /> Add Line
              </button>
            </div>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <LineItem
                  key={idx}
                  line={line}
                  idx={idx}
                  products={products}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  error={lineErrors[idx] || {}}
                />
              ))}
            </div>
            {lines.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                No product lines added. Click "Add Line" to start.
              </div>
            )}
          </div>

          {/* Totals + Notes */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={header.notes}
                onChange={(e) => hField('notes', e.target.value)}
                placeholder="Optional notes for this GRN..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Invoice Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrencyPKR(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Header Discount</span>
                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={header.discount_amount}
                      onChange={(e) => hField('discount_amount', e.target.value)}
                      className="w-28 px-2 py-1 text-xs text-right border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="0.00"
                    />
                    {headerErrors.discount_amount && (
                      <p className="text-red-500 text-[10px] mt-1">
                        {headerErrors.discount_amount}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total GST</span>
                  <span>{formatCurrencyPKR(totals.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-blue-700 border-t border-gray-200 pt-2 mt-2">
                  <span>Net Payable</span>
                  <span>{formatCurrencyPKR(totals.net_payable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || lines.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs + Search ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'draft', label: `Draft (${counts.draft})` },
            { key: 'confirmed', label: `Confirmed (${counts.confirmed})` },
            { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier or invoice no..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* ── GRN List Table ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading GRNs...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  'Invoice No.',
                  'Supplier',
                  'Invoice Date',
                  'Net Payable',
                  'Status',
                  'Created',
                  'Action',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {searchQuery ? 'No GRNs match your search.' : `No ${activeTab} GRNs yet.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((inv) => (
                    <React.Fragment key={inv.purchase_invoice_id}>
                      <tr
                        className={`border-t border-gray-50 transition-colors
                      ${expandedId === inv.purchase_invoice_id ? 'bg-blue-50/30' : 'hover:bg-gray-50/70'}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{inv.supplier_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(inv.invoice_date).toLocaleDateString('en-PK', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {formatCurrencyPKR(inv.net_payable)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(inv.created_at).toLocaleDateString('en-PK', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Expand/collapse */}
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === inv.purchase_invoice_id
                                    ? null
                                    : inv.purchase_invoice_id
                                )
                              }
                              className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              {expandedId === inv.purchase_invoice_id ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                            </button>
                            {inv.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleConfirm(inv.purchase_invoice_id)}
                                  className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleCancel(inv.purchase_invoice_id)}
                                  className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === inv.purchase_invoice_id && (
                        <GRNDetail
                          invoiceId={inv.purchase_invoice_id}
                          onClose={() => setExpandedId(null)}
                        />
                      )}
                    </React.Fragment>
                  ))
              )}
            </tbody>
          </table>
        )}
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
