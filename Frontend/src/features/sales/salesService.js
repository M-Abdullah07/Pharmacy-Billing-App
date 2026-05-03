import { normalizeSaleDraft, validateSaleDraft } from './salesDto';

export const salesService = {
  getCustomers: () => window.electronAPI.getCustomers(),
  getProducts: () => window.electronAPI.getProducts(),

  addSale: async (raw) => {
    const draft = normalizeSaleDraft(raw);
    validateSaleDraft(draft);
    return window.electronAPI.addSale(draft);
  },
};
