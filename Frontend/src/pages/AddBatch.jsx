import React, { useEffect, useState } from 'react';
import { Plus, Search, X, CheckCircle2, AlertCircle, Layers, AlertTriangle } from 'lucide-react';

// ── Expiry status helpers ─────────────────────────────────────────────────────
const getExpiryStatus = (expiryDate) => {
  const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days <= 30)  return { label: 'Critical',  color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' };
  if (days <= 60)  return { label: 'Warning',   color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
  if (days <= 90)  return { label: 'Watch',     color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' };
  return           { label: 'Normal',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' };
};

const getDaysToExpiry = (expiryDate) =>
  Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

const EMPTY_FORM = {
  product_id:             '',
  supplier_id:            '',
  batch_number:           '',
  manufacturing_date:     '',
  expiry_date:            '',
  mrp:                    '',
  purchase_cost_per_unit: '',
  quantity_received:      '',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddBatch() {
  const [batches, setBatches]       = useState([]);
  const [products, setProducts]     = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab]   = useState('all');
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast]           = useState(null);
  const [expiryWarning, setExpiryWarning] = useState('');

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [batchData, productData, supplierData] = await Promise.all([
        window.electronAPI.getBatches(),
        window.electronAPI.getProducts(),
        window.electronAPI.getSuppliers(),
      ]);
      setBatches(Array.isArray(batchData) ? batchData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Open form ───────────────────────────────────────────────────────────────
  const handleOpenForm = () => {
    if (products.length === 0) {
      showToast('Please add at least one product before creating a batch.', 'error');
      return;
    }
    if (suppliers.length === 0) {
      showToast('Please add at least one supplier before creating a batch.', 'error');
      return;
    }
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setExpiryWarning('');
    setShowForm(true);
  };

  // ── Expiry date change — DRAP 90-day guideline check ────────────────────────
  const handleExpiryChange = (value) => {
    field('expiry_date', value);
    if (value) {
      const days = getDaysToExpiry(value);
      if (days < 90) {
        setExpiryWarning(
          days <= 0
            ? 'This batch has already expired.'
            : `Warning: Only ${days} day(s) until expiry. DRAP guideline recommends at least 90 days for receivable stock.`
        );
      } else {
        setExpiryWarning('');
      }
    }
  };

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};

    if (!form.product_id)             errors.product_id             = 'This field is required.';
    if (!form.supplier_id)            errors.supplier_id            = 'This field is required.';
    if (!form.batch_number.trim())    errors.batch_number           = 'This field is required.';
    if (!form.manufacturing_date)     errors.manufacturing_date     = 'This field is required.';
    if (!form.expiry_date)            errors.expiry_date            = 'This field is required.';
    if (!form.mrp)                    errors.mrp                    = 'This field is required.';
    if (!form.purchase_cost_per_unit) errors.purchase_cost_per_unit = 'This field is required.';
    if (!form.quantity_received)      errors.quantity_received      = 'This field is required.';

    // US-105 — expiry must be after manufacturing date
    if (form.manufacturing_date && form.expiry_date) {
      if (new Date(form.expiry_date) <= new Date(form.manufacturing_date)) {
        errors.expiry_date = 'Expiry date must be after manufacturing date.';
      }
    }

    // MRP must be > 0 (DRAP mandate)
    if (form.mrp && Number(form.mrp) <= 0)
      errors.mrp = 'MRP must be greater than 0 (DRAP mandate).';

    // Purchase cost must be > 0
    if (form.purchase_cost_per_unit && Number(form.purchase_cost_per_unit) <= 0)
      errors.purchase_cost_per_unit = 'Purchase cost must be greater than 0.';

    // Quantity must be > 0
    if (form.quantity_received && Number(form.quantity_received) <= 0)
      errors.quantity_received = 'Quantity must be a positive number.';

    return errors;
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const payload = {
        product_id:             form.product_id,
        supplier_id:            form.supplier_id,
        purchase_invoice_id:    null,   // Iteration 2 — GRN linking
        batch_number:           form.batch_number.trim(),
        manufacturing_date:     form.manufacturing_date,
        expiry_date:            form.expiry_date,
        mrp:                    Number(form.mrp),
        purchase_cost_per_unit: Number(form.purchase_cost_per_unit),
        quantity_received:      Number(form.quantity_received),
        // quantity_available is managed by DB trigger — never send it
      };

      const result = await window.electronAPI.addBatch(payload);

      if (result.success) {
        showToast('Batch added successfully. Stock movement auto-created.', 'success');
        setShowForm(false);
        setForm(EMPTY_FORM);
        setExpiryWarning('');
        await loadAll();
      } else {
        // US-105 Alt Flow B — duplicate batch number
        if (result.error?.includes('already exists') || result.error?.includes('batch_number')) {
          setFieldErrors({ batch_number: 'This batch number already exists for this product. Please verify.' });
        } else {
          showToast(result.error || 'Failed to add batch.', 'error');
        }
      }
    } catch (err) {
      showToast('Service unavailable. Contact administrator.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => setToast({ message, type });

  const field = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const selectCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = batches.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      b.product_name?.toLowerCase().includes(q) ||
      b.batch_number?.toLowerCase().includes(q)  ||
      b.supplier_name?.toLowerCase().includes(q);

    if (activeTab === 'critical') return matchSearch && getDaysToExpiry(b.expiry_date) <= 30  && getDaysToExpiry(b.expiry_date) > 0;
    if (activeTab === 'warning')  return matchSearch && getDaysToExpiry(b.expiry_date) <= 60  && getDaysToExpiry(b.expiry_date) > 30;
    if (activeTab === 'watch')    return matchSearch && getDaysToExpiry(b.expiry_date) <= 90  && getDaysToExpiry(b.expiry_date) > 60;
    return matchSearch;
  });

  const counts = {
    all:      batches.length,
    critical: batches.filter(b => getDaysToExpiry(b.expiry_date) <= 30 && getDaysToExpiry(b.expiry_date) > 0).length,
    warning:  batches.filter(b => getDaysToExpiry(b.expiry_date) <= 60 && getDaysToExpiry(b.expiry_date) > 30).length,
    watch:    batches.filter(b => getDaysToExpiry(b.expiry_date) <= 90 && getDaysToExpiry(b.expiry_date) > 60).length,
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Batch Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Add stock batches with MRP, expiry and DRAP compliance tracking</p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Batch
        </button>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add New Batch</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fields marked <span className="text-red-500">*</span> are required.
                MRP is DRAP-mandated and must match the printed pack price.
              </p>
            </div>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setExpiryWarning(''); }}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Row 1 — Product, Supplier, Batch Number */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <select value={form.product_id} onChange={e => field('product_id', e.target.value)} className={selectCls('product_id')}>
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} {p.uom ? `(${p.uom})` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.product_id && <p className="text-red-500 text-xs mt-1">{fieldErrors.product_id}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select value={form.supplier_id} onChange={e => field('supplier_id', e.target.value)} className={selectCls('supplier_id')}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                ))}
              </select>
              {fieldErrors.supplier_id && <p className="text-red-500 text-xs mt-1">{fieldErrors.supplier_id}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.batch_number}
                onChange={e => field('batch_number', e.target.value)}
                placeholder="e.g. AMX-2024-001"
                className={inputCls('batch_number')}
              />
              {fieldErrors.batch_number && <p className="text-red-500 text-xs mt-1">{fieldErrors.batch_number}</p>}
            </div>
          </div>

          {/* Row 2 — Manufacturing Date, Expiry Date */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Manufacturing Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.manufacturing_date}
                onChange={e => field('manufacturing_date', e.target.value)}
                className={inputCls('manufacturing_date')}
              />
              {fieldErrors.manufacturing_date && <p className="text-red-500 text-xs mt-1">{fieldErrors.manufacturing_date}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={e => handleExpiryChange(e.target.value)}
                className={inputCls('expiry_date')}
              />
              {fieldErrors.expiry_date && <p className="text-red-500 text-xs mt-1">{fieldErrors.expiry_date}</p>}
              {/* DRAP 90-day guideline warning */}
              {expiryWarning && !fieldErrors.expiry_date && (
                <div className="flex items-start gap-2 mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-amber-700 text-xs">{expiryWarning}</p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3 — MRP, Purchase Cost, Quantity */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                MRP (Rs) <span className="text-red-500">*</span>
                <span className="ml-1 text-gray-400 font-normal">— DRAP mandated</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.mrp}
                onChange={e => field('mrp', e.target.value)}
                placeholder="0.00"
                className={inputCls('mrp')}
              />
              {fieldErrors.mrp && <p className="text-red-500 text-xs mt-1">{fieldErrors.mrp}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Purchase Cost per Unit (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.purchase_cost_per_unit}
                onChange={e => field('purchase_cost_per_unit', e.target.value)}
                placeholder="0.00"
                className={inputCls('purchase_cost_per_unit')}
              />
              {fieldErrors.purchase_cost_per_unit && <p className="text-red-500 text-xs mt-1">{fieldErrors.purchase_cost_per_unit}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Quantity Received <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity_received}
                onChange={e => field('quantity_received', e.target.value)}
                placeholder="e.g. 100"
                className={inputCls('quantity_received')}
              />
              {fieldErrors.quantity_received && <p className="text-red-500 text-xs mt-1">{fieldErrors.quantity_received}</p>}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-6">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-blue-500" />
            <p className="text-xs text-blue-700">
              Stock movement will be auto-created when this batch is saved.
              <span className="font-medium"> quantity_available</span> is managed automatically by the database.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setExpiryWarning(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
              {loading ? 'Saving...' : 'Save Batch'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs + Search ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'critical', label: `Critical (${counts.critical})`,  color: 'text-red-600' },
            { key: 'warning',  label: `Warning (${counts.warning})`,    color: 'text-amber-600' },
            { key: 'watch',    label: `Watch (${counts.watch})`,        color: 'text-yellow-600' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${activeTab === tab.key
                  ? `bg-white shadow-sm ${tab.color || 'text-gray-900'}`
                  : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product or batch number..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading batches...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Product', 'Batch No.', 'Supplier', 'Mfg. Date', 'Expiry Date', 'Days Left', 'MRP (Rs)', 'Qty Available', 'Expiry Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">
                    <Layers size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {searchQuery
                        ? 'No batches match your search.'
                        : activeTab !== 'all'
                          ? `No batches in ${activeTab} status.`
                          : 'No batches yet. Add your first batch above.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(b => {
                  const expiry  = getExpiryStatus(b.expiry_date);
                  const daysLeft = getDaysToExpiry(b.expiry_date);
                  return (
                    <tr key={b.batch_id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{b.product_name}</div>
                        <div className="text-xs text-gray-400">{b.product_uom}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.batch_number}</td>
                      <td className="px-4 py-3 text-gray-600">{b.supplier_name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(b.manufacturing_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(b.expiry_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${daysLeft <= 30 ? 'text-red-600' : daysLeft <= 60 ? 'text-amber-600' : daysLeft <= 90 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        Rs {Number(b.mrp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${b.quantity_available === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                          {b.quantity_available === 0 ? 'Out of Stock' : b.quantity_available.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${expiry.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${expiry.dot}`} />
                          {expiry.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}