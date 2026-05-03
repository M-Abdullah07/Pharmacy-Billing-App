import { freezeProductForm, toProductPayload } from './productsDto';

export const productsService = {
  getAllProducts: () => window.electronAPI.getAllProducts(),
  getSuppliers: () => window.electronAPI.getSuppliers(),
  getCategories: () => window.electronAPI.getCategories(),
  getStockSummary: () => window.electronAPI.getStockSummary(),
  getStockByProduct: (productId) => window.electronAPI.getStockByProduct(productId),

  addProduct: async (raw) => {
    const dto = freezeProductForm(raw);
    return window.electronAPI.addProduct(toProductPayload(dto));
  },

  updateProduct: async (productId, raw) => {
    const dto = freezeProductForm(raw);
    return window.electronAPI.updateProduct(productId, toProductPayload(dto));
  },

  deactivateProduct: (productId) => window.electronAPI.deactivateProduct(productId),
  reactivateProduct: (productId) => window.electronAPI.reactivateProduct(productId),
};
