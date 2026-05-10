import Toast from '../components/shared/Toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, ShoppingCart } from 'lucide-react';
import { getUserId } from '../utilis/sessions';
import { facade } from '@/core/facade/createFacade';
import { AddCustomerDialog } from './sales/components';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrencyPKR = (val) =>
  `Rs. ${Number(val || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (val) => {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, balanceDue }) {
  // A sale is "paid" when status=confirmed and balance_due=0
  // A sale is "credit" when balance_due > 0 (regardless of status field)
  const isCreditOutstanding = Number(balanceDue) > 0;
  const label = isCreditOutstanding ? 'Credit' : 'Paid';
  const cls = isCreditOutstanding
    ? 'bg-amber-50 text-amber-700 border-amber-300'
    : 'bg-green-50 text-green-700 border-green-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold text-gray-700 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddSale({ onSaleRecorded }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]); // products with stock
  const [sales, setSales] = useState([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saleRate, setSaleRate] = useState('');
  const [saleItems, setSaleItems] = useState([]);
  const [isCredit, setIsCredit] = useState(false);

  // Add customer dialog
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const showToast = (message, type) => setToast({ message, type });

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [custs, prods, saleList] = await Promise.all([
        facade.route('getCustomers'),
        facade.route('getProductsWithStock'),
        facade.route('getSales').catch(() => []),
      ]);
      setCustomers(Array.isArray(custs) ? custs : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setSales(Array.isArray(saleList) ? saleList : []);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const refreshCustomers = async () => {
    try {
      const result = await facade.route('getCustomers');
      setCustomers(Array.isArray(result) ? result : []);
    } catch {}
  };

  // ── Customer ─────────────────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      showToast('Customer name is required.', 'error');
      return;
    }
    try {
      setSaving(true);
      const result = await facade.route('addCustomer', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      if (result.success) {
        await refreshCustomers();
        setSelectedCustomer(result.customerId.toString());
        setShowAddCustomer(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        showToast('Customer added.', 'success');
      } else {
        showToast('Failed to add customer: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Product Lines ─────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!selectedProduct || !quantity || quantity < 1) {
      showToast('Please select a product and enter a valid quantity.', 'error');
      return;
    }
    const product = products.find((p) => p.product_id === selectedProduct);
    if (!product) {
      showToast('Invalid product selection.', 'error');
      return;
    }
    if (saleItems.find((i) => i.productId === product.product_id)) {
      showToast('Product already added. Remove it first to change quantity.', 'error');
      return;
    }
    const available = Number(product.total_stock);
    if (quantity > available) {
      showToast(
        `Insufficient stock. Only ${available} units available for "${product.name}".`,
        'error'
      );
      return;
    }
    setSaleItems((prev) => [
      ...prev,
      {
        productId: product.product_id,
        productName: product.name,
        quantity: parseInt(quantity),
        saleRate: saleRate ? parseFloat(saleRate) : null,
        discountPct: 0,
      },
    ]);
    setQuantity(1);
    setSaleRate('');
    setSelectedProduct('');
  };

  const handleRemoveItem = (idx) =>
    setSaleItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmitSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      showToast('Please select a customer and add at least one item.', 'error');
      return;
    }
    const userId = getUserId();
    if (!userId) {
      showToast('Please login first.', 'error');
      return;
    }
    try {
      setSaving(true);
      const result = await facade.route('addSale', {
        customerId: selectedCustomer,
        userId,
        isCredit,
        items: saleItems,
      });
      if (result.success) {
        showToast(`Sale recorded! Invoice: ${result.invoiceNumber}`, 'success');
        setSaleItems([]);
        setSelectedCustomer('');
        setIsCredit(false);
        setSelectedProduct('');
        setQuantity(1);
        setSaleRate('');
        setShowForm(false);
        await loadAll(); // refresh stock quantities + sales list
        if (onSaleRecorded) onSaleRecorded(result.saleId);
      } else {
        showToast('Failed to record sale: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedProduct('');
    setQuantity(1);
    setSaleRate('');
    setSaleItems([]);
    setIsCredit(false);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const saleTotal = saleItems.reduce((sum, item) => {
    if (item.saleRate) return sum + item.quantity * item.saleRate;
    return sum;
  }, 0);
  const hasPrices = saleItems.length > 0 && saleItems.every((i) => i.saleRate);

  // Tab filtering: use balance_due to determine paid vs credit
  const filtered = sales.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      s.invoice_number?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'credit') return Number(s.balance_due) > 0;
    if (activeTab === 'paid') return Number(s.balance_due) === 0;
    return true;
  });

  const counts = {
    all: sales.length,
    paid: sales.filter((s) => Number(s.balance_due) === 0).length,
    credit: sales.filter((s) => Number(s.balance_due) > 0).length,
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-gray-400';

  const selectCls =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer transition-all';

  return (
    <div className="w-full flex flex-col gap-4 p-1 pb-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sales Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Record customer sales and manage receivables
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> New Sale
          </button>
        )}
      </div>

      {/* ── Sale Form ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* Form header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">New Sale Invoice</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select customer, add products, then submit to record the sale.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Section 1: Customer ─────────────────────────────────────────── */}
          <SectionHeader>Customer Details</SectionHeader>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className={selectCls}
              >
                <option value="">— Select Customer —</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-0.5">
              <button
                onClick={() => setShowAddCustomer(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus size={13} /> Add New Customer
              </button>
            </div>

            <div className="col-span-2 flex items-end justify-end pb-0.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCredit}
                  onChange={(e) => setIsCredit(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                Credit Sale
                <span className="text-xs text-gray-400 font-normal">
                  (customer pays later)
                </span>
              </label>
            </div>
          </div>

          {/* ── Section 2: Add Product ──────────────────────────────────────── */}
          <SectionHeader>Add Products</SectionHeader>
          <div className="grid grid-cols-4 gap-3 mb-3 p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className={selectCls}
              >
                <option value="">— Select Product —</option>
                {products.map((p) => {
                  const stock = Number(p.total_stock);
                  const outOfStock = stock === 0;
                  return (
                    <option
                      key={p.product_id}
                      value={p.product_id}
                      disabled={outOfStock}
                    >
                      {p.name}
                      {p.form ? ` (${p.form})` : ''}
                      {' — '}
                      {outOfStock ? 'Out of Stock' : `${stock} ${p.uom || 'units'} available`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={inputCls}
                placeholder="e.g. 5"
              />
              {/* Show max available for selected product */}
              {selectedProduct && (() => {
                const p = products.find((x) => x.product_id === selectedProduct);
                return p ? (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Max available: <span className="font-semibold text-gray-700">{Number(p.total_stock)} {p.uom || 'units'}</span>
                  </p>
                ) : null;
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Sale Rate{' '}
                <span className="text-gray-400 font-normal">(optional — uses FEFO batch MRP)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={saleRate}
                onChange={(e) => setSaleRate(e.target.value)}
                className={inputCls}
                placeholder="Leave blank for auto"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddItem}
                disabled={!selectedProduct || !quantity}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors w-full justify-center"
              >
                <Plus size={14} /> Add Line
              </button>
            </div>
          </div>

          {/* ── Section 3: Line Items Table ─────────────────────────────────── */}
          <SectionHeader>Sale Lines</SectionHeader>
          {saleItems.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    {['Product', 'Qty', 'Rate', 'Line Total', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.productName}</td>
                      <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.saleRate
                          ? formatCurrencyPKR(item.saleRate)
                          : <span className="text-gray-400 italic text-xs">Auto (FEFO)</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {item.saleRate
                          ? formatCurrencyPKR(item.quantity * item.saleRate)
                          : <span className="text-gray-400 italic text-xs">Auto</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-xl mb-6">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              No product lines added. Use the form above to add items.
            </div>
          )}

          {/* ── Section 4: Summary + Actions ───────────────────────────────── */}
          <SectionHeader>Invoice Summary</SectionHeader>
          <div className="grid grid-cols-2 gap-6 mb-5">
            <div /> {/* spacer */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Line Items</span>
                  <span className="font-medium text-gray-800">{saleItems.length}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Payment Type</span>
                  <span
                    className={`font-semibold ${isCredit ? 'text-amber-600' : 'text-green-600'}`}
                  >
                    {isCredit ? 'Credit (Pay Later)' : 'Cash (Paid Now)'}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-blue-700 border-t border-gray-200 pt-2 mt-2 text-base">
                  <span>Net Receivable</span>
                  <span>
                    {hasPrices ? formatCurrencyPKR(saleTotal) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitSale}
              disabled={saving || saleItems.length === 0 || !selectedCustomer}
              className="px-7 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Submit Sale'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs + Search ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'paid', label: `Paid (${counts.paid})` },
            { key: 'credit', label: `Credit (${counts.credit})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors
                ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
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
            placeholder="Search by customer or invoice..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── Sales List Table ───────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading sales...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  'Invoice No.',
                  'Customer',
                  'Date',
                  'Net Receivable',
                  'Amount Paid',
                  'Balance Due',
                  'Status',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-gray-400">
                    <ShoppingCart size={34} className="mx-auto mb-2 opacity-25" />
                    <p className="text-sm font-medium">
                      {searchQuery
                        ? 'No sales match your search.'
                        : 'No sales recorded yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => (
                  <tr
                    key={sale.sale_invoice_id}
                    className="border-t border-gray-100 hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">
                      {sale.invoice_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {sale.customer_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDate(sale.invoice_date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {formatCurrencyPKR(sale.net_receivable)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCurrencyPKR(sale.amount_paid)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        Number(sale.balance_due) > 0
                          ? 'text-amber-700'
                          : 'text-green-700'
                      }`}
                    >
                      {formatCurrencyPKR(sale.balance_due)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={sale.status}
                        balanceDue={sale.balance_due}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Dialogs & Toasts ───────────────────────────────────────────────── */}
      <AddCustomerDialog
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        newCustomerName={newCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerName={setNewCustomerName}
        setNewCustomerPhone={setNewCustomerPhone}
        onSave={handleAddCustomer}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
