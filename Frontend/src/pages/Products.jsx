import Toast from '../components/shared/Toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, X, CheckCircle2, AlertCircle, Package, AlertTriangle, ChevronRight, BarChart3 } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { facade } from '@/core/facade/createFacade';
import StockSidePanel from './products/StockSidePanel';
import { EMPTY_FORM, FORM_OPTIONS, GST_SLABS, DRUG_SCHEDULES, UOM_OPTIONS, validateProductForm } from './products/productModel';
import { expiryBadge, stockStatusBadge } from './products/stockUi';

// ── Main Component ────────────────────────────────────────────────────────────
export default function Products() {
  // ── Page tab: 'products' | 'stock' ─────────────────────────────────────────
  const [pageTab, setPageTab] = useState('products');

  // ── Products state ──────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [prodSearchQuery, setProdSearchQuery] = useState('');
  const [prodTab, setProdTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [noSupplierWarning, setNoSupplierWarning] = useState(false);

  // ── Stock View state ────────────────────────────────────────────────────────
  const [stockSummary, setStockSummary] = useState([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [stockMfgFilter, setStockMfgFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sidePanelBatches, setSidePanelBatches] = useState([]);
  const [sidePanelLoading, setSidePanelLoading] = useState(false);

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, sups, cats, stock] = await Promise.all([
        facade.route('getAllProducts'),
        facade.route('getSuppliers'),
        facade.route('getCategories'),
        facade.route('getStockSummary'),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setStockSummary(Array.isArray(stock) ? stock : []);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Side panel open ─────────────────────────────────────────────────────────
  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setSidePanelBatches([]);
    setSidePanelLoading(true);
    try {
      const batches = await facade.route('getStockByProduct', product.product_id);
      setSidePanelBatches(Array.isArray(batches) ? batches : []);
    } catch (err) {
      showToast('Failed to load batch details.', 'error');
    } finally {
      setSidePanelLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [prodSearchQuery, prodTab, stockSearch, stockStatusFilter, stockMfgFilter]);

  // ── Products CRUD ───────────────────────────────────────────────────────────
  const handleOpenForm = () => {
    if (suppliers.length === 0) {
      setNoSupplierWarning(true);
      return;
    }
    setNoSupplierWarning(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name || '',
      manufacturer_id: product.manufacturer_id || '',
      category_id: product.category_id || '',
      form: product.form || '',
      uom: product.uom || 'Strip',
      quantity_in_uom: product.quantity_in_uom || 1,
      hsn_code: product.hsn_code || '',
      gst_rate: product.gst_rate ?? 0,
      drug_schedule: product.drug_schedule || 'OTC',
      generic_formula: product.generic_formula || '',
      default_sale_rate: product.default_sale_rate || '',
      default_purchase_rate: product.default_purchase_rate || '',
      shelf_no: product.shelf_no || '',
    });
    setEditingId(product.product_id);
    setFieldErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const errors = validateProductForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const payload = {
        ...form,
        gst_rate: Number(form.gst_rate),
        quantity_in_uom: Number(form.quantity_in_uom) || 1,
        default_sale_rate: Number(form.default_sale_rate) || 0,
        default_purchase_rate: Number(form.default_purchase_rate) || 0,
      };
      const result = editingId
        ? await facade.route('updateProduct', editingId, payload)
        : await facade.route('addProduct', payload);
      if (result.success) {
        showToast(editingId ? 'Product updated.' : 'Product added.', 'success');
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await loadAll();
      } else {
        if (result.error?.includes('already exists'))
          setFieldErrors({ name: 'A product with this name already exists.' });
        else showToast(result.error || 'Failed to save product.', 'error');
      }
    } catch (err) {
      showToast('Service unavailable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?`)) return;
    try {
      const result = await facade.route('deactivateProduct', id);
      if (result.success) {
        showToast(`"${name}" deactivated.`, 'success');
        await loadAll();
      } else showToast(result.error || 'Failed.', 'error');
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  const handleReactivate = async (id, name) => {
    if (!window.confirm(`Reactivate "${name}"?`)) return;
    try {
      const result = await facade.route('reactivateProduct', id);
      if (result.success) {
        showToast(`"${name}" reactivated.`, 'success');
        await loadAll();
      } else showToast(result.error || 'Failed.', 'error');
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  const showToast = (message, type) => setToast({ message, type });

  const field = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const selectCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  // ── Products filter ─────────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const q = prodSearchQuery.toLowerCase();
    const matchSearch =
      p.name?.toLowerCase().includes(q) ||
      p.manufacturer_name?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q);
    if (prodTab === 'discontinued') return matchSearch && !p.is_active;
    return matchSearch && p.is_active;
  });

  const prodCounts = {
    all: products.filter((p) => p.is_active).length,
    discontinued: products.filter((p) => !p.is_active).length,
  };

  // ── Stock filter ────────────────────────────────────────────────────────────
  const filteredStock = stockSummary.filter((s) => {
    const q = stockSearch.toLowerCase();
    const matchSearch =
      s.product_name?.toLowerCase().includes(q) || s.category_name?.toLowerCase().includes(q);
    const matchStatus = stockStatusFilter === 'all' || s.stock_status === stockStatusFilter;
    const matchMfg = !stockMfgFilter || s.manufacturer_name === stockMfgFilter;
    return matchSearch && matchStatus && matchMfg;
  });

  const stockStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'normal', label: 'In Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'expiry_critical', label: 'Expiry Critical' },
    { value: 'expiry_warning', label: 'Expiry Warning' },
    { value: 'expiry_watch', label: 'Expiry Watch' },
  ];

  const uniqueManufacturers = [
    ...new Set(stockSummary.map((s) => s.manufacturer_name).filter(Boolean)),
  ].sort();

  // ── KPI counts for stock ────────────────────────────────────────────────────
  const stockKpis = {
    total: stockSummary.length,
    outOfStock: stockSummary.filter((s) => s.stock_status === 'out_of_stock').length,
    critical: stockSummary.filter((s) => s.stock_status === 'expiry_critical').length,
    totalValue: stockSummary.reduce((sum, s) => sum + Number(s.total_stock_value_at_mrp || 0), 0),
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">
      {/* ── Page-level Tab Switch: Products | Stock View ────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPageTab('products')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${pageTab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Package size={15} /> Products
          </button>
          <button
            onClick={() => setPageTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${pageTab === 'stock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 size={15} /> Stock View
          </button>
        </div>

        {pageTab === 'products' && (
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PRODUCTS TAB                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {pageTab === 'products' && (
        <>
          {/* No company warning */}
          {noSupplierWarning && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium">No companies found</p>
                <p className="mt-0.5 text-amber-700">
                  Please go to <span className="font-semibold">Companies</span> and add at least
                  one first.
                </p>
              </div>
              <button
                onClick={() => setNoSupplierWarning(false)}
                className="ml-auto shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {editingId ? 'Edit Product' : 'Add New Medicine'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fields marked <span className="text-red-500">*</span> are required.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Medicine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => field('name', e.target.value)}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={inputCls('name')}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company / Manufacturer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.manufacturer_id}
                    onChange={(e) => field('manufacturer_id', e.target.value)}
                    className={selectCls('manufacturer_id')}
                  >
                    <option value="">Select Company</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.manufacturer_id && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.manufacturer_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => field('category_id', e.target.value)}
                    className={selectCls('category_id')}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category_id && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.category_id}</p>
                  )}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Form</label>
                  <select
                    value={form.form}
                    onChange={(e) => field('form', e.target.value)}
                    className={selectCls('form')}
                  >
                    <option value="">Select Form</option>
                    {FORM_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Pack Size (UOM)
                  </label>
                  <select
                    value={form.uom}
                    onChange={(e) => field('uom', e.target.value)}
                    className={selectCls('uom')}
                  >
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Units per Pack</label>
                  <input type="number" min="1" value={form.quantity_in_uom}
                    onChange={e => field('quantity_in_uom', e.target.value)}
                    placeholder="e.g. 10" className={inputCls('quantity_in_uom')} />
                  {fieldErrors.quantity_in_uom && <p className="text-red-500 text-xs mt-1">{fieldErrors.quantity_in_uom}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    HS Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.hsn_code}
                    onChange={(e) => field('hsn_code', e.target.value)}
                    placeholder="e.g. 3004"
                    className={inputCls('hsn_code')}
                  />
                  {fieldErrors.hsn_code && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.hsn_code}</p>
                  )}
                </div>
              </div>

              {/* Row 3 */}
              {/* H13: GST_SLABS (productModel.js) holds FBR-relevant slabs (0/1/18), not
                  Indian GST slabs. Owner must verify these against the current FBR
                  notification/SRO before this is used to bill a real customer. */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    FBR GST Rate <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.gst_rate}
                    onChange={(e) => field('gst_rate', Number(e.target.value))}
                    className={selectCls('gst_rate')}
                  >
                    {GST_SLABS.map((g) => (
                      <option key={g} value={g}>
                        {g}%
                      </option>
                    ))}
                  </select>
                  {fieldErrors.gst_rate && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.gst_rate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    DRAP Schedule <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.drug_schedule}
                    onChange={(e) => field('drug_schedule', e.target.value)}
                    className={selectCls('drug_schedule')}
                  >
                    {DRUG_SCHEDULES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.drug_schedule && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.drug_schedule}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Default Sale Rate (Rs)</label>
                  <input type="number" min="0" step="0.01" value={form.default_sale_rate}
                    onChange={e => field('default_sale_rate', e.target.value)}
                    placeholder="0.00" className={inputCls('default_sale_rate')} />
                  {fieldErrors.default_sale_rate && <p className="text-red-500 text-xs mt-1">{fieldErrors.default_sale_rate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Default Purchase Rate (Rs)</label>
                  <input type="number" min="0" step="0.01" value={form.default_purchase_rate}
                    onChange={e => field('default_purchase_rate', e.target.value)}
                    placeholder="0.00" className={inputCls('default_purchase_rate')} />
                  {fieldErrors.default_purchase_rate && <p className="text-red-500 text-xs mt-1">{fieldErrors.default_purchase_rate}</p>}
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Generic Formula
                  </label>
                  <input
                    type="text"
                    value={form.generic_formula}
                    onChange={(e) => field('generic_formula', e.target.value)}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={inputCls('generic_formula')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shelf / Rack No
                  </label>
                  <input
                    type="text"
                    value={form.shelf_no}
                    onChange={(e) => field('shelf_no', e.target.value)}
                    placeholder="e.g. A-12"
                    className={inputCls('shelf_no')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </div>
          )}

          {/* Products sub-tabs + search */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'all', label: `All (${prodCounts.all})` },
                { key: 'discontinued', label: `Discontinued (${prodCounts.discontinued})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setProdTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                    ${prodTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={prodSearchQuery}
                onChange={(e) => setProdSearchQuery(e.target.value)}
                placeholder="Search by name or manufacturer..."
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Loading products...
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      'Medicine Name',
                      'Manufacturer',
                      'Category',
                      'Schedule',
                      'GST',
                      'Status',
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
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-gray-400">
                        <Package size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          {prodSearchQuery
                            ? 'No products match your search.'
                            : prodTab === 'discontinued'
                              ? 'No discontinued products.'
                              : 'No products yet. Add your first product above.'}
                        </p>
                      </td>
                    </tr>
                  ) : filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(product => (
                    <tr key={product.product_id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.generic_formula && <div className="text-xs text-gray-400 mt-0.5">{product.generic_formula}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.manufacturer_name || '—'}</td>
                      <td className="px-4 py-3">
                        {product.category_name
                          ? <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">{product.category_name}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                          ${product.drug_schedule === 'X'  ? 'bg-red-100 text-red-700' :
                            product.drug_schedule === 'H1' ? 'bg-orange-100 text-orange-700' :
                            product.drug_schedule === 'H'  ? 'bg-amber-100 text-amber-700' :
                            product.drug_schedule === 'G'  ? 'bg-yellow-100 text-yellow-700' :
                                                             'bg-green-100 text-green-700'}`}>
                          {product.drug_schedule}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.gst_rate}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full
                          ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {product.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(product)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                            Edit
                          </button>
                          {product.is_active ? (
                            <button onClick={() => handleDeactivate(product.product_id, product.name)}
                              className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                              Deactivate
                            </button>
                          ) : (
                            '—'
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
            
            {/* Pagination Controls */}
            <Pagination 
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* STOCK VIEW TAB                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {pageTab === 'stock' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: 'Total Products',
                value: stockKpis.total,
                sub: 'in master',
                cls: 'border-gray-200',
              },
              {
                label: 'Out of Stock',
                value: stockKpis.outOfStock,
                sub: 'need restocking',
                cls: 'border-red-200 bg-red-50/50',
              },
              {
                label: 'Expiry Critical',
                value: stockKpis.critical,
                sub: '≤ 30 days',
                cls: 'border-red-200 bg-red-50/30',
              },
              {
                label: 'Total Stock Value',
                value: `Rs ${stockKpis.totalValue.toLocaleString()}`,
                sub: 'at MRP',
                cls: 'border-blue-200 bg-blue-50/30',
              },
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-white border ${kpi.cls} rounded-xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search by product or category..."
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {stockStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={stockMfgFilter}
              onChange={(e) => setStockMfgFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="">All Manufacturers</option>
              {uniqueManufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {(stockSearch || stockStatusFilter !== 'all' || stockMfgFilter) && (
              <button
                onClick={() => {
                  setStockSearch('');
                  setStockStatusFilter('all');
                  setStockMfgFilter('');
                }}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Stock Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Loading stock...
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      'Product',
                      'Manufacturer',
                      'Category',
                      'Total Qty',
                      'Nearest Expiry',
                      'Stock Value',
                      'Status',
                      '',
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
                <tbody className="divide-y divide-gray-50">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-gray-400">
                        <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          {stockSearch || stockStatusFilter !== 'all' || stockMfgFilter
                            ? 'No products match your filters.'
                            : 'No stock data yet. Add batches first.'}
                        </p>
                      </td>
                    </tr>
                  ) : filteredStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => {
                    const status  = stockStatusBadge(s.stock_status);
                    const nearest = s.nearest_expiry
                      ? Math.floor((new Date(s.nearest_expiry) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;
                    const expiry = expiryBadge(nearest);
                    const isOutOfStock = s.stock_status === 'out_of_stock';
                    return (
                      <tr
                        key={s.product_id}
                        onClick={() => handleSelectProduct(s)}
                        className={`cursor-pointer transition-colors
                          ${isOutOfStock ? 'bg-red-50/40' : 'hover:bg-gray-50/70'}
                          ${selectedProduct?.product_id === s.product_id ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{s.product_name}</div>
                            {s.generic_formula && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {s.generic_formula}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {s.manufacturer_name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {s.category_name ? (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                {s.category_name}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${isOutOfStock ? 'text-red-500' : 'text-gray-900'}`}
                            >
                              {Number(s.total_quantity).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">{s.uom}</span>
                          </td>
                          <td className="px-4 py-3">
                            {s.nearest_expiry ? (
                              <div>
                                <p className="text-xs text-gray-600">
                                  {new Date(s.nearest_expiry).toLocaleDateString('en-PK', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className={`text-xs font-medium ${expiry.cls}`}>
                                  {nearest > 0 ? `${nearest}d left` : 'Expired'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                            Rs {Number(s.total_stock_value_at_mrp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${status.cls}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight
                              size={14}
                              className={`text-gray-300 transition-colors
                            ${selectedProduct?.product_id === s.product_id ? 'text-blue-400' : 'group-hover:text-gray-400'}`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            <Pagination 
              totalItems={filteredStock.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* ── Side Panel ─────────────────────────────────────────────────────── */}
      {selectedProduct && pageTab === 'stock' && (
        <StockSidePanel
          product={selectedProduct}
          batches={sidePanelBatches}
          onClose={() => {
            setSelectedProduct(null);
            setSidePanelBatches([]);
          }}
          loading={sidePanelLoading}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
