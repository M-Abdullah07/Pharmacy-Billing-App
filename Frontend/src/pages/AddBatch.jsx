import React, { useEffect, useState } from 'react';
import { Search, Layers, Package } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddBatch() {
  const [batches, setBatches]           = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeTab, setActiveTab]       = useState('all');
  const [loading, setLoading]           = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadBatches(); }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const batchData = await window.electronAPI.getBatches();
      setBatches(Array.isArray(batchData) ? batchData : []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

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
          <h1 className="text-xl font-semibold text-gray-900">Batch Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View all stock batches, expiry timelines, and DRAP compliance status.
            New batches are created automatically when a Purchase Invoice is confirmed.
          </p>
        </div>
      </div>

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
            placeholder="Search by product, batch or supplier..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                          : 'No batches yet. Confirm a Purchase Invoice to create batches.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(b => {
                  const expiry   = getExpiryStatus(b.expiry_date);
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
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}