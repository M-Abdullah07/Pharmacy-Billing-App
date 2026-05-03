import Toast from '../components/shared/Toast';
import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
  Trash2,
  Star,
} from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { facade } from '@/core/facade/createFacade';
import {
  CONTACT_ROLES,
  CUSTOMER_TYPES,
  EMPTY_CONTACT,
  EMPTY_FORM,
  PAYMENT_TERMS,
  customerTypeBadge,
  validateContactForm,
  validateCustomerForm,
} from './customers/customerFormModel';



export default function AddCustomer() {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [contactErrors, setContactErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);
  const [showContactForm, setShowContactForm] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const all = await facade.route('getCustomersWithContact');
      setCustomers(Array.isArray(all) ? all : []);
    } catch (err) {
      showToast('Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleOpenForm = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setContactErrors({});
    setEditingId(null);
    setContacts([]);
    setPendingContacts([]);
    setNewContact(EMPTY_CONTACT);
    setShowContactForm(false);
    setShowForm(true);
  };

  const handleEdit = async (customer) => {
    setForm({
      name: customer.name || '',
      strn: customer.strn || '',
      ntn: customer.ntn || '',
      drug_licence_no: customer.drug_licence_no || '',
      address: customer.address || '',
      city: customer.city || '',
      territory: customer.territory || '',
      customer_type: customer.customer_type || 'retailer',
      credit_limit: customer.credit_limit ?? 0,
      payment_terms: customer.payment_terms || '',
    });
    setEditingId(customer.customer_id);
    setFieldErrors({});
    setContactErrors({});
    setNewContact(EMPTY_CONTACT);
    setShowContactForm(false);
    setPendingContacts([]);
    const existing = await facade.route('getContactPersons', 'customer', customer.customer_id);
    setContacts(Array.isArray(existing) ? existing : []);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const errors = validateCustomerForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setContactErrors({});
    setLoading(true);
    try {
      const payload = { ...form, credit_limit: Number(form.credit_limit) || 0 };
      let result;
      let customerId = editingId;
      if (editingId) {
        result = await facade.route('updateCustomer', editingId, payload);
      } else {
        result = await facade.route('addCustomer', payload);
        customerId = result.lastID;
      }
      if (!result.success) {
        if (result.error?.includes('STRN') || result.error?.includes('already registered'))
          setFieldErrors({ strn: 'This STRN is already registered for another customer.' });
        else showToast(result.error || 'Failed to save customer.', 'error');
        return;
      }
      for (const contact of pendingContacts) {
        await facade.route('addContactPerson', {
          ...contact,
          entity_type: 'customer',
          entity_id: customerId,
        });
      }
      showToast(
        editingId ? 'Customer updated successfully.' : 'Customer added successfully.',
        'success'
      );
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setContacts([]);
      setPendingContacts([]);
      await loadCustomers();
    } catch (err) {
      showToast('Service unavailable. Contact administrator.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPendingContact = () => {
    const errors = validateContactForm(newContact);
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }
    setContactErrors({});
    setPendingContacts((prev) => [...prev, { ...newContact }]);
    setNewContact(EMPTY_CONTACT);
    setShowContactForm(false);
  };

  const handleSaveContact = async () => {
    const errors = validateContactForm(newContact);
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }
    setContactErrors({});
    try {
      const result = await facade.route('addContactPerson', {
        ...newContact,
        entity_type: 'customer',
        entity_id: editingId,
      });
      if (result.success) {
        const updated = await facade.route('getContactPersons', 'customer', editingId);
        setContacts(Array.isArray(updated) ? updated : []);
        setNewContact(EMPTY_CONTACT);
        setShowContactForm(false);
        showToast('Contact added.', 'success');
      }
    } catch (err) {
      showToast('Failed to add contact.', 'error');
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await facade.route('deleteContactPerson', contactId);
      setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
      showToast('Contact removed.', 'success');
    } catch (err) {
      showToast('Failed to remove contact.', 'error');
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"? Historical records will be retained.`)) return;
    try {
      const result = await facade.route('deleteCustomer', id);
      if (result.success) {
        showToast(`"${name}" deactivated.`, 'success');
        await loadCustomers();
      } else showToast(result.error || 'Failed to deactivate.', 'error');
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  const handleReactivate = async (id, name) => {
    if (!window.confirm(`Reactivate "${name}"?`)) return;
    try {
      const result = await facade.route('reactivateCustomer', id);
      if (result.success) {
        showToast(`"${name}" reactivated.`, 'success');
        await loadCustomers();
      } else showToast(result.error || 'Failed to reactivate.', 'error');
    } catch (err) {
      showToast('Service unavailable.', 'error');
    }
  };

  const showToast = (message, type) => setToast({ message, type });

  const field = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const selectCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      c.name?.toLowerCase().includes(q) ||
      c.strn?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.territory?.toLowerCase().includes(q);
    if (activeTab === 'deactivated') return matchSearch && !c.is_active;
    return matchSearch && c.is_active;
  });

  const counts = {
    active: customers.filter((c) => c.is_active).length,
    deactivated: customers.filter((c) => !c.is_active).length,
  };

  const allContacts = editingId ? contacts : pendingContacts;

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customers with credit limits, STRN and territory details
          </p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fields marked <span className="text-red-500">*</span> are required.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Row 1 — Name, Type, Credit Limit */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="e.g. Al-Shifa Pharmacy"
                className={inputCls('name')}
              />
              {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.customer_type}
                onChange={(e) => field('customer_type', e.target.value)}
                className={selectCls('customer_type')}
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              {fieldErrors.customer_type && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.customer_type}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Credit Limit (Rs)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.credit_limit}
                onChange={(e) => field('credit_limit', e.target.value)}
                placeholder="0.00"
                className={inputCls('credit_limit')}
              />
              {fieldErrors.credit_limit && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.credit_limit}</p>
              )}
            </div>
          </div>

          {/* Row 2 — STRN, NTN, DRAP */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">STRN</label>
              <input
                type="text"
                value={form.strn}
                onChange={(e) => field('strn', e.target.value)}
                placeholder="13-digit STRN"
                maxLength={13}
                className={inputCls('strn')}
              />
              {fieldErrors.strn && <p className="text-red-500 text-xs mt-1">{fieldErrors.strn}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">NTN</label>
              <input
                type="text"
                value={form.ntn}
                onChange={(e) => field('ntn', e.target.value)}
                placeholder="e.g. 1234567-8"
                className={inputCls('ntn')}
              />
              {fieldErrors.ntn && <p className="text-red-500 text-xs mt-1">{fieldErrors.ntn}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DRAP Drug Licence
              </label>
              <input
                type="text"
                value={form.drug_licence_no}
                onChange={(e) => field('drug_licence_no', e.target.value)}
                placeholder="e.g. RTL-2024-001"
                className={inputCls('drug_licence_no')}
              />
              {fieldErrors.drug_licence_no && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.drug_licence_no}</p>
              )}
            </div>
          </div>

          {/* Row 3 — City, Territory, Address */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => field('city', e.target.value)}
                placeholder="e.g. Lahore"
                className={inputCls('city')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Territory</label>
              <input
                type="text"
                value={form.territory}
                onChange={(e) => field('territory', e.target.value)}
                placeholder="e.g. DHA, Gulberg, Saddar"
                className={inputCls('territory')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => field('address', e.target.value)}
                placeholder="Street address"
                className={inputCls('address')}
              />
            </div>
          </div>

          {/* Row 4 — Payment Terms */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
              <select
                value={form.payment_terms}
                onChange={(e) => field('payment_terms', e.target.value)}
                className={selectCls('payment_terms')}
              >
                <option value="">Select Payment Terms</option>
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Persons */}
          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Contact Persons
              </h3>
              {!showContactForm && (
                <button
                  type="button"
                  onClick={() => setShowContactForm(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <UserPlus size={13} /> Add Contact
                </button>
              )}
            </div>

            {allContacts.length > 0 && (
              <div className="space-y-2 mb-3">
                {allContacts.map((c, idx) => (
                  <div
                    key={c.contact_id || idx}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {c.is_primary && <Star size={12} className="text-amber-400 fill-amber-400" />}
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {c.name}
                          {c.role && (
                            <span className="ml-1 text-gray-400 font-normal">· {c.role}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {[c.contact_number, c.email].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                    {c.contact_id && (
                      <button
                        onClick={() => handleDeleteContact(c.contact_id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showContactForm && (
              <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => {
                        setNewContact((p) => ({ ...p, name: e.target.value }));
                        if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Contact name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    {contactErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{contactErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newContact.role}
                      onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="">Select Role</option>
                      {CONTACT_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={newContact.contact_number}
                      onChange={(e) => {
                        setNewContact((p) => ({ ...p, contact_number: e.target.value }));
                        if (contactErrors.contact_number)
                          setContactErrors((prev) => ({ ...prev, contact_number: '' }));
                      }}
                      placeholder="e.g. 0300-1234567"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    {contactErrors.contact_number && (
                      <p className="text-red-500 text-xs mt-1">{contactErrors.contact_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => {
                        setNewContact((p) => ({ ...p, email: e.target.value }));
                        if (contactErrors.email)
                          setContactErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="e.g. contact@pharmacy.com"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    {contactErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{contactErrors.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContact.is_primary}
                      onChange={(e) =>
                        setNewContact((p) => ({ ...p, is_primary: e.target.checked }))
                      }
                      className="rounded"
                    />
                    Set as primary contact
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowContactForm(false);
                        setNewContact(EMPTY_CONTACT);
                      }}
                      className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={editingId ? handleSaveContact : handleAddPendingContact}
                      className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      {editingId ? 'Save Contact' : 'Add Contact'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : editingId ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'active', label: `Active (${counts.active})` },
            { key: 'deactivated', label: `Deactivated (${counts.deactivated})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, STRN, city or territory..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading customers...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  'Name',
                  'Type',
                  'STRN',
                  'City',
                  'Territory',
                  'Credit Limit',
                  'Primary Contact',
                  'Status',
                  'Action',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {searchQuery
                        ? 'No customers match your search.'
                        : activeTab === 'deactivated'
                          ? 'No deactivated customers.'
                          : 'No customers yet. Add your first customer above.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${customerTypeBadge(c.customer_type)}`}
                        >
                          {c.customer_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {c.strn || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.city || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.territory || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.credit_limit > 0 ? (
                          `Rs ${Number(c.credit_limit).toLocaleString()}`
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.primary_contact_name ? (
                          <div>
                            <p className="text-xs font-medium text-gray-800">
                              {c.primary_contact_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {c.primary_contact_number || '—'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full
                      ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                          />
                          {c.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          {c.is_active ? (
                            <button
                              onClick={() => handleDeactivate(c.customer_id, c.name)}
                              className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(c.customer_id, c.name)}
                              className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        )}
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
