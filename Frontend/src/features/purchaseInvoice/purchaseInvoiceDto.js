function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function calcLine(line) {
  const qty = asNumber(line.quantity);
  const rate = asNumber(line.purchase_cost_per_unit);
  const disc = asNumber(line.discount_pct);
  const gst = asNumber(line.gst_rate);
  const base = qty * rate * (1 - disc / 100);
  const tax = (base * gst) / 100;
  return { base: +base.toFixed(2), tax: +tax.toFixed(2), total: +(base + tax).toFixed(2) };
}

export function calcTotals(lines, headerDiscount) {
  const subtotal = lines.reduce((sum, line) => sum + calcLine(line).base, 0);
  const taxAmount = lines.reduce((sum, line) => sum + calcLine(line).tax, 0);
  const discount = asNumber(headerDiscount);
  return Object.freeze({
    subtotal: +subtotal.toFixed(2),
    tax_amount: +taxAmount.toFixed(2),
    discount_amount: +discount.toFixed(2),
    net_payable: +Math.max(0, subtotal + taxAmount - discount).toFixed(2),
  });
}

export function freezeDraft(raw) {
  const draft = Object.freeze({
    header: Object.freeze({ ...(raw?.header ?? {}) }),
    lines: Object.freeze([...(raw?.lines ?? [])].map((line) => Object.freeze({ ...line }))),
  });

  if (!draft.header.supplier_id) throw new Error('supplier required');
  if (!String(draft.header.invoice_number ?? '').trim()) throw new Error('invoice_number required');
  if (!draft.lines.length) throw new Error('line required');

  for (const line of draft.lines) {
    if (!line.product_id) throw new Error('product required');
    if (!String(line.batch_number ?? '').trim()) throw new Error('batch required');
    if (!line.manufacturing_date || !line.expiry_date) throw new Error('date required');
    if (new Date(line.expiry_date) <= new Date(line.manufacturing_date))
      throw new Error('expiry invalid');
    if (asNumber(line.mrp) <= 0) throw new Error('mrp invalid');
    if (asNumber(line.purchase_cost_per_unit) <= 0) throw new Error('rate invalid');
    if (asNumber(line.quantity) <= 0) throw new Error('quantity invalid');
  }

  return draft;
}

export function toHeaderPayload(header) {
  return {
    ...header,
    discount_amount: asNumber(header.discount_amount),
  };
}

export function toLinePayload(line) {
  const calc = calcLine(line);
  return {
    ...line,
    mrp: asNumber(line.mrp),
    purchase_cost_per_unit: asNumber(line.purchase_cost_per_unit),
    quantity: asNumber(line.quantity),
    discount_pct: asNumber(line.discount_pct),
    gst_rate: asNumber(line.gst_rate),
    line_total: calc.base,
    tax_amount: calc.tax,
  };
}
