export const GST_SLABS = [0, 5, 12, 18, 28];

export const EMPTY_HEADER = {
  supplier_id: '',
  invoice_number: '',
  invoice_date: new Date().toISOString().split('T')[0],
  received_date: new Date().toISOString().split('T')[0],
  notes: '',
  discount_amount: 0,
};

export const EMPTY_LINE = {
  product_id: '',
  batch_number: '',
  manufacturing_date: '',
  expiry_date: '',
  mrp: '',
  purchase_cost_per_unit: '',
  quantity: '',
  discount_pct: 0,
  gst_rate: 0,
};

export function formatCurrencyPKR(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
}

export function validatePurchaseDraft(header, lines) {
  const headerErrors = {};
  if (!header.supplier_id) headerErrors.supplier_id = 'Required.';
  if (!header.invoice_number.trim()) headerErrors.invoice_number = 'Required.';
  if (!header.invoice_date) headerErrors.invoice_date = 'Required.';
  if (header.discount_amount && Number(header.discount_amount) < 0) {
    headerErrors.discount_amount = 'Cannot be negative.';
  }

  const lineErrors = lines.map((line) => {
    const errors = {};
    if (!line.product_id) errors.product_id = 'Required.';
    if (!line.batch_number.trim()) errors.batch_number = 'Required.';
    if (!line.manufacturing_date) errors.manufacturing_date = 'Required.';
    if (!line.expiry_date) errors.expiry_date = 'Required.';
    if (
      line.expiry_date &&
      line.manufacturing_date &&
      new Date(line.expiry_date) <= new Date(line.manufacturing_date)
    ) {
      errors.expiry_date = 'Must be after manufacturing date.';
    }
    if (!line.mrp || Number(line.mrp) <= 0) errors.mrp = 'MRP must be > 0.';
    if (!line.purchase_cost_per_unit || Number(line.purchase_cost_per_unit) <= 0) {
      errors.purchase_cost_per_unit = 'Rate must be > 0.';
    }
    if (!line.quantity || Number(line.quantity) <= 0) {
      errors.quantity = 'Qty must be a positive integer.';
    }
    if (line.discount_pct && Number(line.discount_pct) < 0) {
      errors.discount_pct = 'Discount cannot be negative.';
    }
    return errors;
  });

  return { headerErrors, lineErrors };
}
