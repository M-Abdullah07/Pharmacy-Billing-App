export function normalizeSaleDraft(raw) {
  return Object.freeze({
    customerId: String(raw?.customerId ?? ''),
    userId: raw?.userId,
    isCredit: Boolean(raw?.isCredit),
    items: Object.freeze(
      (raw?.items ?? []).map((item) =>
        Object.freeze({
          productId: String(item?.productId ?? ''),
          quantity: Number(item?.quantity ?? 0),
          saleRate: item?.saleRate == null ? null : Number(item.saleRate),
          discountPct: Number(item?.discountPct ?? 0),
        })
      )
    ),
  });
}

export function validateSaleDraft(draft) {
  if (!draft.customerId) throw new Error('customer required');
  if (!draft.userId) throw new Error('user required');
  if (!draft.items.length) throw new Error('items required');

  const seen = new Set();
  for (const item of draft.items) {
    if (!item.productId) throw new Error('product required');
    if (item.quantity <= 0) throw new Error('quantity invalid');
    if (seen.has(item.productId)) throw new Error('duplicate product');
    seen.add(item.productId);
  }
}
