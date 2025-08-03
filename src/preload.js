const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  queryDb: (query, params) => ipcRenderer.invoke('query-db', query, params),
  insertSale: (saleData) => ipcRenderer.invoke('insert-sale', saleData),
  loginUser: (username, password) => ipcRenderer.invoke('login-user', username, password),
  addArea: (areaName) => ipcRenderer.invoke('add-area', areaName),

  // 👇 New: Add, Get, Update, Delete Customers + Areas + Companies
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getAreas: () => ipcRenderer.invoke('get-areas'),
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  updateCustomer: (id, data) => ipcRenderer.invoke('update-customer', id, data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  addCompany: (company) => ipcRenderer.invoke('add-company', company),
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),

});

