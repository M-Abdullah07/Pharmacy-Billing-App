import React, { useEffect, useState } from 'react';
import { Plus, Search, X, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

const EMPTY_FORM = {
  name: '', drap_mfg_licence: '', country: 'Pakistan', contact_number: '', email: '',
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

export default function Manufacturers() {
  const [manufacturers, setManufacturers] = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors]     = useState({});
  const [toast, setToast]                 = useState(null);
  const [activeTab, setActiveTab]         = useState('active');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { loadManufacturers(); }, []);

  const loadManufacturers = async () => {
    setLoading(true);
    try {
      const all = await window.electronAPI.queryDb(
        `SELECT manufacturer_id, name, drap_mfg_licence, country,
                contact_number, email, is_active, created_at
         FROM manufacturers ORDER BY name`
      );
      setManufacturers(Array.isArray(all) ? all : []);
    } catch (err) { showToast('Failed to load manufacturers.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleOpenForm = () => {
    setForm(EMPTY_FORM); setFieldErrors({}); setEditingId(null); setShowForm(true);
  };

  const handleEdit = (mfg) => {
    setForm({
      name:             mfg.name              || '',
      drap_mfg_licence: mfg.drap_mfg_licence  || '',
      country:          mfg.country           || 'Pakistan',
      contact_number:   mfg.contact_number    || '',
      email:            mfg.email             || '',
    });
    setEditingId(mfg.manufacturer_id);
    setFieldErrors({}); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim())    errors.name    = 'This field is required.';
    if (!form.country.trim()) errors.country = 'This field is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Please enter a valid email address.';
    return errors;
  };

  const handleSave = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({}); setLoading(true);
    try {
      const result = editingId
        ? await window.electronAPI.updateManufacturer(editingId, form)
        : await window.electronAPI.addManufacturer(form);

      if (result.success) {
        showToast(editingId ? 'Manufacturer updated successfully.' : 'Manufacturer added successfully.', 'success');
        setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
        await loadManufacturers();
      } else {
        if (result.error?.includes('already exists'))
          setFieldErrors({ name: 'A manufacturer with this name already exists.' });
        else showToast(result.error || 'Failed to save manufacturer.', 'error');
      }
    } catch (err) { showToast('Service unavailable. Contact administrator.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"? Products linked to this manufacturer will be affected.`)) return;
    try {
      const result = await window.electronAPI.deactivateManufacturer(id);
      if (result.success) { showToast(`"${name}" deactivated.`, 'success'); await loadManufacturers(); }
      else showToast(result.error || 'Failed to deactivate.', 'error');
    } catch (err) { showToast('Service unavailable.', 'error'); }
  };

  const handleReactivate = async (id, name) => {
    if (!window.confirm(`Reactivate "${name}"?`)) return;
    try {
      const result = await window.electronAPI.reactivateManufacturer(id);
      if (result.success) { showToast(`"${name}" reactivated.`, 'success'); await loadManufacturers(); }
      else showToast(result.error || 'Failed to reactivate.', 'error');
    } catch (err) { showToast('Service unavailable.', 'error'); }
  };

  const showToast = (message, type) => setToast({ message, type });

  const field = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-md bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
     ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const filtered = manufacturers.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = m.name?.toLowerCase().includes(q)
      || m.country?.toLowerCase().includes(q)
      || m.drap_mfg_licence?.toLowerCase().includes(q);
    if (activeTab === 'deactivated') return matchSearch && !m.is_active;
    return matchSearch && m.is_active;
  });

  const counts = {
    active:      manufacturers.filter(m => m.is_active).length,
    deactivated: manufacturers.filter(m => !m.is_active).length,
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manufacturers</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage pharmaceutical manufacturers and DRAP licences</p>
        </div>
        <button onClick={handleOpenForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Manufacturer
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{editingId ? 'Edit Manufacturer' : 'Add New Manufacturer'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fields marked <span className="text-red-500">*</span> are required.</p>
            </div>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          {/* Row 1 — Name, DRAP Licence, Country */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Manufacturer Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => field('name', e.target.value)}
                placeholder="e.g. GSK Pakistan" className={inputCls('name')} />
              {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">DRAP Mfg. Licence No.</label>
              <input type="text" value={form.drap_mfg_licence} onChange={e => field('drap_mfg_licence', e.target.value)}
                placeholder="e.g. MFG-2024-001" className={inputCls('drap_mfg_licence')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
              <input type="text" value={form.country} onChange={e => field('country', e.target.value)}
                placeholder="e.g. Pakistan" className={inputCls('country')} />
              {fieldErrors.country && <p className="text-red-500 text-xs mt-1">{fieldErrors.country}</p>}
            </div>
          </div>

          {/* Row 2 — Contact, Email */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="text" value={form.contact_number} onChange={e => field('contact_number', e.target.value)}
                placeholder="e.g. 0300-1234567" className={inputCls('contact_number')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={form.email} onChange={e => field('email', e.target.value)}
                placeholder="e.g. info@gsk.com.pk" className={inputCls('email')} />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
              {loading ? 'Saving...' : editingId ? 'Update Manufacturer' : 'Save Manufacturer'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[{ key: 'active', label: `Active (${counts.active})` }, { key: 'deactivated', label: `Deactivated (${counts.deactivated})` }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, country or licence..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading manufacturers...
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'DRAP Licence', 'Country', 'Contact', 'Email', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{searchQuery ? 'No manufacturers match your search.'
                      : activeTab === 'deactivated' ? 'No deactivated manufacturers.'
                      : 'No manufacturers yet. Add your first manufacturer above.'}</p>
                  </td>
                </tr>
              ) : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(mfg => (
                <tr key={mfg.manufacturer_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{mfg.name}</div>
                    {mfg.country !== 'Pakistan' && <div className="text-xs text-blue-500 mt-0.5">Imported</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{mfg.drap_mfg_licence || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{mfg.country}</td>
                  <td className="px-4 py-3 text-gray-600">{mfg.contact_number || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{mfg.email || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full
                      ${mfg.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${mfg.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {mfg.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(mfg)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                        Edit
                      </button>
                      {mfg.is_active ? (
                        <button onClick={() => handleDeactivate(mfg.manufacturer_id, mfg.name)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(mfg.manufacturer_id, mfg.name)}
                          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors">
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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