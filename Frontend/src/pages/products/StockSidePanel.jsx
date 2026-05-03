import { X } from 'lucide-react';
import { expiryBadge, stockStatusBadge } from './stockUi';

export default function StockSidePanel({ product, batches, onClose, loading }) {
  if (!product) return null;
  const status = stockStatusBadge(product.stock_status);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{product.product_name}</h2>
            {product.generic_formula && (
              <p className="text-xs text-gray-500 mt-0.5">{product.generic_formula}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${status.cls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="text-xs text-gray-400">{product.manufacturer_name}</span>
              {product.is_imported && (
                <span className="text-xs text-blue-500 font-medium">Imported</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Qty</p>
            <p
              className={`text-lg font-bold ${product.total_quantity === 0 ? 'text-red-500' : 'text-gray-900'}`}
            >
              {Number(product.total_quantity).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{product.uom}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Stock Value</p>
            <p className="text-sm font-bold text-gray-900">
              Rs {Number(product.total_stock_value_at_mrp).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">at MRP</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Batches</p>
            <p className="text-lg font-bold text-gray-900">{product.active_batch_count}</p>
            <p className="text-xs text-gray-400">active</p>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Product Details
          </p>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            {[
              ['Category', product.category_name || '—'],
              ['Form', product.form || '—'],
              ['UOM', product.uom || '—'],
              ['Schedule', product.drug_schedule || '—'],
              ['Shelf No.', product.shelf_no || '—'],
              [
                'Sale Rate',
                product.default_sale_rate
                  ? `Rs ${Number(product.default_sale_rate).toLocaleString()}`
                  : '—',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-gray-400">{label}: </span>
                <span className="text-gray-700 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Batch Breakdown
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading batches...
            </div>
          ) : batches.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No active batches for this product.
            </div>
          ) : (
            <div className="px-5 pb-5 space-y-2">
              {batches.map((batch) => {
                const days = Math.floor(
                  (new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                const exp = expiryBadge(days);
                const expiryStatusCls =
                  days <= 30
                    ? 'border-red-200 bg-red-50/50'
                    : days <= 60
                      ? 'border-amber-200 bg-amber-50/50'
                      : days <= 90
                        ? 'border-yellow-200 bg-yellow-50/50'
                        : 'border-gray-100 bg-white';
                return (
                  <div key={batch.batch_id} className={`border rounded-lg p-3 ${expiryStatusCls}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-800 font-mono">
                        {batch.batch_number}
                      </span>
                      <span className={`text-xs font-medium ${exp.cls}`}>
                        {days <= 0 ? 'Expired' : `Expires in ${exp.label}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Expiry</p>
                        <p className="text-gray-700 font-medium">
                          {new Date(batch.expiry_date).toLocaleDateString('en-PK', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">MRP</p>
                        <p className="text-gray-700 font-medium">
                          Rs {Number(batch.mrp).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Available</p>
                        <p
                          className={`font-semibold ${batch.quantity_available === 0 ? 'text-red-500' : 'text-gray-900'}`}
                        >
                          {batch.quantity_available === 0
                            ? 'Out'
                            : batch.quantity_available.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
