export function normalizeCustomerPayload(raw) {
  return Object.freeze({
    name: String(raw?.name ?? '').trim(),
    strn: String(raw?.strn ?? '').trim(),
    ntn: String(raw?.ntn ?? '').trim(),
    drug_licence_no: String(raw?.drug_licence_no ?? '').trim(),
    address: String(raw?.address ?? '').trim(),
    city: String(raw?.city ?? '').trim(),
    territory: String(raw?.territory ?? '').trim(),
    customer_type: String(raw?.customer_type ?? 'retailer'),
    credit_limit: Number(raw?.credit_limit ?? 0),
    payment_terms: String(raw?.payment_terms ?? ''),
  });
}

export function validateCustomer(payload) {
  if (!payload.name) throw new Error('name required');
  if (!payload.customer_type) throw new Error('customer_type required');
  if (Number(payload.credit_limit) < 0) throw new Error('credit_limit invalid');
  if (payload.strn && !/^\d{13}$/.test(payload.strn.replace(/-/g, '')))
    throw new Error('strn invalid');
  if (payload.ntn && !/^\d{7}-\d{1}$/.test(payload.ntn)) throw new Error('ntn invalid');
  if (payload.drug_licence_no && !/^[A-Z0-9]+-\d{4}-\d{3}$/i.test(payload.drug_licence_no)) {
    throw new Error('drap invalid');
  }
}

export function normalizeContactPayload(raw) {
  return Object.freeze({
    name: String(raw?.name ?? '').trim(),
    role: String(raw?.role ?? ''),
    contact_number: String(raw?.contact_number ?? '').trim(),
    email: String(raw?.email ?? '').trim(),
    is_primary: Boolean(raw?.is_primary),
    entity_type: String(raw?.entity_type ?? ''),
    entity_id: raw?.entity_id,
  });
}

export function validateContact(payload) {
  if (!payload.name) throw new Error('contact name required');
  if (!payload.contact_number && !payload.email) throw new Error('phone or email required');
  if (
    payload.contact_number &&
    !/^\+?(?:\d[ -]?|\(\d+\)[ -]?){7,20}$/.test(payload.contact_number)
  ) {
    throw new Error('phone invalid');
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('email invalid');
  }
}
