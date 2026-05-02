const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Auth ──────────────────────────────────────────────────────────────────
  loginUser:  (username, password)       => ipcRenderer.invoke('login-user',  username, password),
  signupUser: (username, password) => ipcRenderer.invoke('signup-user', username, password),

  // ── Manufacturers ─────────────────────────────────────────────────────────
  getManufacturers:    ()        => ipcRenderer.invoke('get-manufacturers'),
  addManufacturer:     (data)    => ipcRenderer.invoke('add-manufacturer',    data),
  updateManufacturer:  (id, data)=> ipcRenderer.invoke('update-manufacturer', id, data),
  deactivateManufacturer: (id)   => ipcRenderer.invoke('deactivate-manufacturer', id),

  // ── Categories (read-only — pre-seeded by schema) ─────────────────────────
  getCategories: () => ipcRenderer.invoke('get-categories'),

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts:       ()        => ipcRenderer.invoke('get-products'),
  getProductsAlias:  ()        => ipcRenderer.invoke('getProducts'),   // camelCase alias
  addProduct:        (data)    => ipcRenderer.invoke('add-product',        data),
  updateProduct:     (id, data)=> ipcRenderer.invoke('update-product',     id, data),
  deactivateProduct: (id)      => ipcRenderer.invoke('deactivate-product', id),

  // ── Suppliers ─────────────────────────────────────────────────────────────
  getSuppliers:       ()        => ipcRenderer.invoke('get-suppliers'),
  addSupplier:        (data)    => ipcRenderer.invoke('add-supplier',        data),
  updateSupplier:     (id, data)=> ipcRenderer.invoke('update-supplier',     id, data),
  deactivateSupplier: (id)      => ipcRenderer.invoke('deactivate-supplier', id),

  // ── Customers ─────────────────────────────────────────────────────────────
  getCustomers:   ()         => ipcRenderer.invoke('get-customers'),
  addCustomer:    (data)     => ipcRenderer.invoke('add-customer',    data),
  updateCustomer: (id, data) => ipcRenderer.invoke('update-customer', id, data),
  deleteCustomer: (id)       => ipcRenderer.invoke('delete-customer', id),

  // ── Contact Persons ───────────────────────────────────────────────────────────
  addContactPerson:    (data)                 => ipcRenderer.invoke('add-contact-person',    data),
  getContactPersons:   (entityType, entityId) => ipcRenderer.invoke('get-contact-persons',   entityType, entityId),
  deleteContactPerson: (contactId)            => ipcRenderer.invoke('delete-contact-person', contactId),

  reactivateSupplier:     (id) => ipcRenderer.invoke('reactivate-supplier',     id),
  reactivateCustomer:     (id) => ipcRenderer.invoke('reactivate-customer',     id),
  reactivateProduct:      (id) => ipcRenderer.invoke('reactivate-product',      id),
  reactivateManufacturer: (id) => ipcRenderer.invoke('reactivate-manufacturer', id),
  // ── Batches ───────────────────────────────────────────────────────────────
  getBatches: ()     => ipcRenderer.invoke('get-batches'),
  addBatch:   (data) => ipcRenderer.invoke('add-batch', data),

  // ── Stock View ────────────────────────────────────────────────────────────
  getStockSummary:   ()          => ipcRenderer.invoke('get-stock-summary'),
  getStockByProduct: (productId) => ipcRenderer.invoke('get-stock-by-product', productId),
  getNearExpiry:     ()          => ipcRenderer.invoke('get-near-expiry'),

  // ── Companies (backward compat — maps to suppliers table internally) ───────
  getCompanies: ()     => ipcRenderer.invoke('get-companies'),
  addCompany:   (data) => ipcRenderer.invoke('add-company', data),

  // ── Purchase Invoices (GRN) ───────────────────────────────────────────────────
  getPurchaseInvoices:    ()     => ipcRenderer.invoke('get-purchase-invoices'),
  getPurchaseInvoice:     (id)   => ipcRenderer.invoke('get-purchase-invoice',      id),
  addPurchaseInvoice:     (data) => ipcRenderer.invoke('add-purchase-invoice',      data),
  addPurchaseInvoiceItem: (data) => ipcRenderer.invoke('add-purchase-invoice-item', data),
  confirmPurchaseInvoice: (id, userId) => ipcRenderer.invoke('confirm-purchase-invoice', id, userId),
  cancelPurchaseInvoice:  (id)   => ipcRenderer.invoke('cancel-purchase-invoice',   id),
  getBatchesByProduct:    (productId) => ipcRenderer.invoke('get-batches-by-product', productId),
  // ── REMOVED (no longer in schema — update any .jsx still calling these) ───
  // ❌ addArea    → area_id is gone; send territory (string) on customer instead
  // ❌ getAreas   → same as above
  // ❌ insertSale → will be added in Iteration 2 (sale_invoices table)
  // ── Sales ─────────────────────────────────────────────────────────────────
  addSale: (data) => ipcRenderer.invoke('add-sale', data),
  getSales: () => ipcRenderer.invoke('get-sales'),
  getSaleDetails: (saleInvoiceId) => ipcRenderer.invoke('get-sale-details', saleInvoiceId),

  // ── Purchase Returns ──────────────────────────────────────────────────────
  getPurchaseReturns: () => ipcRenderer.invoke('get-purchase-returns'),
  addPurchaseReturn: (data) => ipcRenderer.invoke('add-purchase-return', data),

  // ── Supplier Ledger ───────────────────────────────────────────────────────
  getOutstandingPayables: () => ipcRenderer.invoke('get-outstanding-payables'),
  getSupplierLedger: (supplierId, startDate, endDate) => ipcRenderer.invoke('get-supplier-ledger', supplierId, startDate, endDate),

  // ── General Database Query ───────────────────────────────────────────────
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  runDb: (sql, params) => ipcRenderer.invoke('run-db', sql, params),

  // ── Backup & Export ───────────────────────────────────────────────────────
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  exportToCsv: (data) => ipcRenderer.invoke('export-to-csv', data),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

});