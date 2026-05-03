const GST_SLABS = new Set([0, 5, 12, 18, 28]);

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function freezeProductForm(raw) {
  const dto = Object.freeze({
    name: String(raw?.name ?? '').trim(),
    manufacturer_id: String(raw?.manufacturer_id ?? ''),
    category_id: String(raw?.category_id ?? ''),
    form: String(raw?.form ?? ''),
    uom: String(raw?.uom ?? 'Strip'),
    quantity_in_uom: asNumber(raw?.quantity_in_uom, 1),
    hsn_code: String(raw?.hsn_code ?? '').trim(),
    gst_rate: asNumber(raw?.gst_rate, 0),
    drug_schedule: String(raw?.drug_schedule ?? 'OTC'),
    generic_formula: String(raw?.generic_formula ?? '').trim(),
    default_sale_rate: asNumber(raw?.default_sale_rate, 0),
    default_purchase_rate: asNumber(raw?.default_purchase_rate, 0),
    shelf_no: String(raw?.shelf_no ?? '').trim(),
  });

  validateProductForm(dto);
  return dto;
}

export function validateProductForm(dto) {
  if (!dto.name) throw new Error('name required');
  if (!dto.manufacturer_id) throw new Error('manufacturer required');
  if (!dto.category_id) throw new Error('category required');
  if (!dto.hsn_code) throw new Error('hsn required');
  if (!GST_SLABS.has(dto.gst_rate)) throw new Error('gst invalid');
  if (dto.quantity_in_uom < 1) throw new Error('quantity invalid');
  if (dto.default_sale_rate < 0 || dto.default_purchase_rate < 0) throw new Error('rate invalid');
}

export function toProductPayload(dto) {
  return {
    ...dto,
    gst_rate: Number(dto.gst_rate),
    quantity_in_uom: Number(dto.quantity_in_uom) || 1,
    default_sale_rate: Number(dto.default_sale_rate) || 0,
    default_purchase_rate: Number(dto.default_purchase_rate) || 0,
  };
}
