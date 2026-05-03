export const stockStatusBadge = (status) =>
  ({
    out_of_stock: { label: 'Out of Stock', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    expiry_critical: { label: 'Expiry Critical', cls: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
    expiry_warning: {
      label: 'Expiry Warning',
      cls: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-500',
    },
    expiry_watch: {
      label: 'Expiry Watch',
      cls: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500',
    },
    normal: { label: 'In Stock', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  })[status] || { label: status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };

export const expiryBadge = (days) => {
  if (days === null || days === undefined) return { label: '—', cls: 'text-gray-400' };
  if (days <= 30) return { label: `${days}d`, cls: 'text-red-600 font-semibold' };
  if (days <= 60) return { label: `${days}d`, cls: 'text-amber-600 font-semibold' };
  if (days <= 90) return { label: `${days}d`, cls: 'text-yellow-600 font-semibold' };
  return { label: `${days}d`, cls: 'text-gray-500' };
};
