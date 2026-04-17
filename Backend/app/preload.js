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

  // ── Sales ─────────────────────────────────────────────────────────────────
  addSale: (data) => ipcRenderer.invoke('add-sale', data),

  // ── General Database Query ───────────────────────────────────────────────
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),

});