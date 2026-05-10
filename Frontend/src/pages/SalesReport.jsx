import Toast from '../components/shared/Toast';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { facade } from '@/core/facade/createFacade';
import { Pagination } from '@/components/shared/Pagination';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (val) =>
  `Rs. ${Number(val || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (val) => {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ balanceDue }) {
  const isCredit = Number(balanceDue) > 0;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border
        ${isCredit
          ? 'bg-amber-50 text-amber-700 border-amber-300'
          : 'bg-green-50 text-green-700 border-green-300'
        }`}
    >
      {isCredit ? 'Credit' : 'Paid'}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-700'   },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-700'  },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', val: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`${c.bg} p-3 rounded-lg`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-lg font-bold ${c.val} leading-tight`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Inline Detail Row ─────────────────────────────────────────────────────────
function SaleDetail({ invoiceId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI.getSaleDetails(invoiceId);
        if (res?.success) setData(res);
        else setError(res?.error || 'Failed to load details.');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  return (
    <tr>
      <td colSpan="8" className="px-0 py-0 border-t border-blue-100">
        <div className="bg-blue-50/40 border-b border-blue-100 px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Loading details...
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 py-2">⚠ {error}</p>
          )}
          {data && (
            <div className="space-y-3">
              {/* Invoice meta */}
              <div className="flex flex-wrap gap-6 text-xs text-gray-600 mb-3">
                <span>
                  <span className="font-semibold text-gray-700">Customer: </span>
                  {data.header.customer_name}
                </span>
                <span>
                  <span className="font-semibold text-gray-700">Date: </span>
                  {fmtDate(data.header.invoice_date)}
                </span>
                <span>
                  <span className="font-semibold text-gray-700">Invoice: </span>
                  {data.header.invoice_number}
                </span>
                <span>
                  <span className="font-semibold text-gray-700">Status: </span>
                  <StatusBadge balanceDue={data.header.balance_due} />
                </span>
              </div>

              {/* Line items table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Product', 'Batch', 'Qty', 'Sale Rate', 'Discount %', 'GST', 'Line Total'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 font-bold text-gray-600 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.item_id}
                        className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{item.product_name}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600">{item.batch_number}</td>
                        <td className="px-4 py-2.5 text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-gray-700">{fmt(item.sale_rate)}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {Number(item.discount_pct || 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{fmt(item.tax_amount)}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{fmt(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals summary */}
              <div className="flex justify-end">
                <div className="bg-white border border-gray-200 rounded-lg px-5 py-3 min-w-[260px] space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{fmt(data.header.subtotal)}</span>
                  </div>
                  {Number(data.header.discount_amount) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span className="text-red-600">−{fmt(data.header.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span>{fmt(data.header.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-700 border-t border-gray-200 pt-2 mt-1">
                    <span>Net Receivable</span>
                    <span>{fmt(data.header.net_receivable)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Amount Paid</span>
                    <span className="text-green-700">{fmt(data.header.amount_paid)}</span>
                  </div>
                  {Number(data.header.balance_due) > 0 && (
                    <div className="flex justify-between font-semibold text-amber-700 border-t border-gray-200 pt-2">
                      <span>Balance Due</span>
                      <span>{fmt(data.header.balance_due)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
                >
                  ▲ Collapse
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalesReport({ focusSaleId }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const showToast = (message, type) => setToast({ message, type });

  const loadSales = async () => {
    setLoading(true);
    try {
      const rows = await facade.route('getSales');
      setSales(Array.isArray(rows) ? rows : []);
    } catch (err) {
      showToast('Failed to load sales: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Auto-expand the focused sale (navigated from Add Sale)
  useEffect(() => {
    if (focusSaleId) setExpandedId(focusSaleId);
  }, [focusSaleId]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalReceivable = sales.reduce((s, r) => s + Number(r.net_receivable || 0), 0);
    const totalPaid       = sales.reduce((s, r) => s + Number(r.amount_paid   || 0), 0);
    const totalOutstanding= sales.reduce((s, r) => s + Number(r.balance_due   || 0), 0);
    const creditCount     = sales.filter((r) => Number(r.balance_due) > 0).length;
    return { totalReceivable, totalPaid, totalOutstanding, creditCount };
  }, [sales]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sales.filter((s) => {
      const matchSearch =
        s.invoice_number?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (activeTab === 'paid')   return Number(s.balance_due) === 0;
      if (activeTab === 'credit') return Number(s.balance_due) > 0;
      return true;
    });
  }, [sales, searchQuery, activeTab]);

  const counts = useMemo(() => ({
    all:    sales.length,
    paid:   sales.filter((s) => Number(s.balance_due) === 0).length,
    credit: sales.filter((s) => Number(s.balance_due) > 0).length,
  }), [sales]);

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full flex flex-col gap-4 p-1 pb-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sales Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View all recorded sales, receivables, and customer balances
          </p>
        </div>
        <button
          onClick={loadSales}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Total Invoices"
          value={sales.length}
          sub={`${counts.paid} paid · ${counts.credit} credit`}
          icon={FileText}
          color="blue"
        />
        <KpiCard
          label="Gross Receivable"
          value={fmt(kpis.totalReceivable)}
          sub="All invoices combined"
          icon={TrendingUp}
          color="purple"
        />
        <KpiCard
          label="Total Collected"
          value={fmt(kpis.totalPaid)}
          sub="Cash + partial payments"
          icon={CheckCircle2}
          color="green"
        />
        <KpiCard
          label="Outstanding Balance"
          value={fmt(kpis.totalOutstanding)}
          sub={`${counts.credit} invoices unpaid`}
          icon={kpis.totalOutstanding > 0 ? AlertCircle : CheckCircle2}
          color={kpis.totalOutstanding > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* ── Tabs + Search ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all',    label: `All (${counts.all})`       },
            { key: 'paid',   label: `Paid (${counts.paid})`     },
            { key: 'credit', label: `Credit (${counts.credit})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors
                ${activeTab === tab.key
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
            placeholder="Search by customer or invoice no..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── Sales Table ───────────────────────────────────────────────────── */}
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
                {['Invoice No.', 'Customer', 'Date', 'Net Receivable', 'Amount Paid', 'Balance Due', 'Status', 'Details'].map((h) => (
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
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-14 text-gray-400">
                    <FileText size={34} className="mx-auto mb-2 opacity-25" />
                    <p className="text-sm font-medium">
                      {searchQuery ? 'No sales match your search.' : `No ${activeTab === 'all' ? '' : activeTab + ' '}sales yet.`}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((sale) => {
                  const isExpanded = expandedId === sale.sale_invoice_id;
                  const isFocused  = focusSaleId === sale.sale_invoice_id;
                  const hasBalance = Number(sale.balance_due) > 0;
                  return (
                    <React.Fragment key={sale.sale_invoice_id}>
                      <tr
                        className={`border-t border-gray-100 transition-colors
                          ${isExpanded  ? 'bg-blue-50/30'   : ''}
                          ${isFocused && !isExpanded ? 'bg-yellow-50/40' : ''}
                          ${!isExpanded && !isFocused ? 'hover:bg-gray-50/70' : ''}
                        `}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">
                          {sale.invoice_number}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {sale.customer_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {fmtDate(sale.invoice_date)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {fmt(sale.net_receivable)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {fmt(sale.amount_paid)}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${hasBalance ? 'text-amber-700' : 'text-green-700'}`}>
                          {fmt(sale.balance_due)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge balanceDue={sale.balance_due} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : sale.sale_invoice_id)
                            }
                            className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <SaleDetail
                          invoiceId={sale.sale_invoice_id}
                          onClose={() => setExpandedId(null)}
                        />
                      )}
                    </React.Fragment>
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
