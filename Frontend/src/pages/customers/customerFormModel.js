export const CUSTOMER_TYPES = ['retailer', 'wholesaler', 'hospital', 'clinic', 'government'];
export const PAYMENT_TERMS = ['Cash on Delivery', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
export const CONTACT_ROLES = ['Owner', 'Manager', 'Salesman', 'Accounts', 'Other'];

export const EMPTY_FORM = {
  name: '',
  strn: '',
  ntn: '',
  drug_licence_no: '',
  address: '',
  city: '',
  territory: '',
  customer_type: 'retailer',
  credit_limit: 0,
  payment_terms: '',
};

export const EMPTY_CONTACT = { name: '', role: '', contact_number: '', email: '', is_primary: false };

export function validateCustomerForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'This field is required.';
  if (!form.customer_type) errors.customer_type = 'This field is required.';
  if (Number(form.credit_limit) < 0) errors.credit_limit = 'Credit limit cannot be negative.';
  if (form.strn && !/^\d{13}$/.test(form.strn.replace(/-/g, ''))) {
    errors.strn = 'Invalid STRN format. Please enter a valid 13-digit Pakistani STRN.';
  }
  if (form.ntn && !/^\d{7}-\d{1}$/.test(form.ntn.trim())) {
    errors.ntn = 'Invalid NTN format. Use e.g. 1234567-8.';
  }
  if (form.drug_licence_no && !/^[A-Z0-9]+-\d{4}-\d{3}$/i.test(form.drug_licence_no.trim())) {
    errors.drug_licence_no = 'Invalid DRAP licence format. Use e.g. RTL-2024-001.';
  }
  return errors;
}

export function validateContactForm(contact) {
  const errors = {};
  if (!contact.name.trim()) errors.name = 'Contact name is required.';
  if (contact.contact_number && !/^\+?(?:\d[ -]?|\(\d+\)[ -]?){7,20}$/.test(contact.contact_number.trim())) {
    errors.contact_number = 'Invalid phone number format.';
  }
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    errors.email = 'Invalid email address.';
  }
  if (!contact.contact_number.trim() && !contact.email.trim()) {
    errors.contact_number = 'Provide a phone number or email for the contact.';
  }
  return errors;
}

export const customerTypeBadge = (type) =>
  ({
    retailer: 'bg-blue-50 text-blue-700',
    wholesaler: 'bg-purple-50 text-purple-700',
    hospital: 'bg-red-50 text-red-700',
    clinic: 'bg-orange-50 text-orange-700',
    government: 'bg-green-50 text-green-700',
  })[type] || 'bg-gray-100 text-gray-600';
