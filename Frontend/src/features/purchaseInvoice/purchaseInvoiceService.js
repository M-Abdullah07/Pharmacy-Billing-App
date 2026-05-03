import { calcTotals, freezeDraft, toHeaderPayload, toLinePayload } from './purchaseInvoiceDto';

export const purchaseInvoiceService = {
  getPurchaseInvoices: () => window.electronAPI.getPurchaseInvoices(),
  getPurchaseInvoice: (invoiceId) => window.electronAPI.getPurchaseInvoice(invoiceId),

  async addPurchaseInvoice(raw) {
    const draft = freezeDraft(raw);
    const totals = calcTotals(draft.lines, draft.header.discount_amount);
    return window.electronAPI.addPurchaseInvoice({
      ...toHeaderPayload(draft.header),
      ...totals,
      status: 'draft',
    });
  },

  addPurchaseInvoiceItem: (line) => window.electronAPI.addPurchaseInvoiceItem(toLinePayload(line)),
  confirmPurchaseInvoice: (invoiceId, userId) =>
    window.electronAPI.confirmPurchaseInvoice(invoiceId, userId),
  cancelPurchaseInvoice: (invoiceId) => window.electronAPI.cancelPurchaseInvoice(invoiceId),
};
