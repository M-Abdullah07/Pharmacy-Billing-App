import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { facade } from '@/core/facade/createFacade';
import { calcLine } from '@/features/purchaseInvoice/purchaseInvoiceDto';
import { formatCurrencyPKR, GST_SLABS } from './model';

export function StatusBadge({ status }) {
  const map = {
    draft: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}
    >
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

export function LineItem({ line, idx, products, onUpdate, onRemove, error = {} }) {
  const { base, tax, total } = calcLine(line);
  const updateField = (field, value) => onUpdate(idx, { [field]: value });
  const inputCls =
    'w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';
  const selectCls =
    'w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer';

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative">
      <button
        onClick={() => onRemove(idx)}
        className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"
      >
        <Trash2 size={14} />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500">Line {idx + 1}</span>
        <div className="ml-auto text-xs font-semibold text-gray-700">
          Line Total: <span className="text-blue-600">{formatCurrencyPKR(total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Product <span className="text-red-500">*</span>
          </label>
          <select
            value={line.product_id}
            onChange={(e) => updateField('product_id', e.target.value)}
            className={selectCls}
          >
            <option value="">Select Product</option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
          {error.product_id && <p className="text-red-500 text-[10px] mt-1">{error.product_id}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Batch Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={line.batch_number}
            onChange={(e) => updateField('batch_number', e.target.value)}
            placeholder="e.g. AMX-2024-001"
            className={inputCls}
          />
          {error.batch_number && <p className="text-red-500 text-[10px] mt-1">{error.batch_number}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mfg. Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={line.manufacturing_date}
            onChange={(e) => updateField('manufacturing_date', e.target.value)}
            className={inputCls}
          />
          {error.manufacturing_date && (
            <p className="text-red-500 text-[10px] mt-1">{error.manufacturing_date}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={line.expiry_date}
            onChange={(e) => updateField('expiry_date', e.target.value)}
            className={inputCls}
          />
          {error.expiry_date && <p className="text-red-500 text-[10px] mt-1">{error.expiry_date}</p>}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            MRP (Rs) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={line.mrp}
            onChange={(e) => updateField('mrp', e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Purchase Rate <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={line.purchase_cost_per_unit}
            onChange={(e) => updateField('purchase_cost_per_unit', e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={line.quantity}
            onChange={(e) => updateField('quantity', e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={line.discount_pct}
            onChange={(e) => updateField('discount_pct', e.target.value)}
            placeholder="0"
            className={inputCls}
          />
          {error.discount_pct && <p className="text-red-500 text-[10px] mt-1">{error.discount_pct}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">GST %</label>
          <select
            value={line.gst_rate}
            onChange={(e) => updateField('gst_rate', Number(e.target.value))}
            className={selectCls}
          >
            {GST_SLABS.map((g) => (
              <option key={g} value={g}>
                {g}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {line.quantity && line.purchase_cost_per_unit ? (
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span>Base: {formatCurrencyPKR(base)}</span>
          <span>Tax: {formatCurrencyPKR(tax)}</span>
          <span className="text-gray-600 font-medium">Total: {formatCurrencyPKR(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function GRNDetail({ invoiceId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facade.route('getPurchaseInvoice', invoiceId).then((response) => {
      setData(response);
      setLoading(false);
    });
  }, [invoiceId]);

  if (loading) {
    return (
      <tr>
        <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Loading details...
          </div>
        </td>
      </tr>
    );
  }

  if (!data?.header) return null;

  return (
    <tr>
      <td colSpan="7" className="px-4 py-0">
        <div className="mb-3 border border-blue-100 bg-blue-50/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">
              GRN {data.header.invoice_number} — {data.items.length} line item(s)
            </p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50/50">
                {['Product', 'Batch', 'Mfg Date', 'Expiry', 'MRP', 'Rate', 'Qty', 'Disc%', 'GST%', 'Line Total'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.item_id} className="border-t border-blue-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{item.product_name}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{item.batch_number}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.manufacturing_date ? new Date(item.manufacturing_date).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(item.expiry_date).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrencyPKR(item.mrp)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrencyPKR(item.purchase_cost_per_unit)}</td>
                  <td className="px-3 py-2 text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-gray-600">{item.discount_pct}%</td>
                  <td className="px-3 py-2 text-gray-600">{item.gst_rate}%</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    {formatCurrencyPKR(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-blue-200 bg-blue-50">
                <td colSpan="7" />
                <td
                  colSpan="2"
                  className="px-3 py-2 text-right text-xs font-semibold text-gray-600"
                >
                  <div>Subtotal</div>
                  <div>Discount</div>
                  <div>Tax</div>
                  <div className="text-blue-700">Net Payable</div>
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-gray-700">
                  <div>{formatCurrencyPKR(data.header.subtotal)}</div>
                  <div>{formatCurrencyPKR(data.header.discount_amount)}</div>
                  <div>{formatCurrencyPKR(data.header.tax_amount)}</div>
                  <div className="text-blue-700">{formatCurrencyPKR(data.header.net_payable)}</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}
