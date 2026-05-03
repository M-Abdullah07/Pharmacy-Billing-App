import {
  normalizeContactPayload,
  normalizeCustomerPayload,
  validateContact,
  validateCustomer,
} from './customersDto';

export const customersService = {
  getCustomersWithContact: () => window.electronAPI.getCustomersWithContact(),
  getContactPersons: (entityType, entityId) =>
    window.electronAPI.getContactPersons(entityType, entityId),

  addCustomer: async (raw) => {
    // Keep legacy quick-add contract used by AddSale modal.
    if (
      raw &&
      typeof raw === 'object' &&
      !('customer_type' in raw) &&
      typeof raw.name === 'string' &&
      raw.name.trim() &&
      (!('phone' in raw) || typeof raw.phone === 'string')
    ) {
      return window.electronAPI.addCustomer(raw);
    }
    const payload = normalizeCustomerPayload(raw);
    validateCustomer(payload);
    return window.electronAPI.addCustomer(payload);
  },

  updateCustomer: async (customerId, raw) => {
    const payload = normalizeCustomerPayload(raw);
    validateCustomer(payload);
    return window.electronAPI.updateCustomer(customerId, payload);
  },

  addContactPerson: async (raw) => {
    const payload = normalizeContactPayload(raw);
    validateContact(payload);
    return window.electronAPI.addContactPerson(payload);
  },

  deleteContactPerson: (contactId) => window.electronAPI.deleteContactPerson(contactId),
  deleteCustomer: (customerId) => window.electronAPI.deleteCustomer(customerId),
  reactivateCustomer: (customerId) => window.electronAPI.reactivateCustomer(customerId),
};
