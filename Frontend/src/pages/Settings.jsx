import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Store,
  Settings as SettingsIcon,
  Printer,
  ShieldCheck,
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  FileText,
  CreditCard,
  Bell,
  Volume2,
  VolumeX,
  FolderOpen,
  Moon,
  Sun,
  Layout,
  HardDrive,
  UserCog,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Custom Slick Toggle ---
function Toggle({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-blue-500/20 ${
        checked ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// --- Desktop Toast ---
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-8 right-8 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-sm font-bold animate-in fade-in slide-in-from-right-8 duration-500 border backdrop-blur-xl
      ${type === 'success' ? 'bg-white/90 dark:bg-zinc-900/90 text-green-800 dark:text-green-400 border-green-100 dark:border-green-900/30' : 'bg-white/90 dark:bg-zinc-900/90 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30'}`}
    >
      <div
        className={`p-1.5 rounded-full ${type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
      >
        {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      </div>
      <span className="flex-1 tracking-tight">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    profile: {
      name: 'Pharmax Solutions',
      email: 'contact@pharmax.com',
      phone: '+92 300 1234567',
      address: '123 Health Street, Lahore, Pakistan',
      drapLicense: 'DL-12345-X',
      drugLicense: 'LHR-9988-24',
      strn: '1234567-8',
      ntn: '9876543-2',
    },
    invoicing: {
      prefix: 'INV-',
      footerMsg: 'Medicines once sold will not be returned or exchanged without original bill.',
      defaultTax: '0',
      currency: 'Rs',
    },
    printing: {
      type: 'thermal',
      printerName: 'Default POS Printer',
      paperSize: '80mm',
    },
    system: {
      notifications: true,
      notificationSound: true,
      darkMode: false,
      autoBackup: false,
      backupFrequency: 'daily',
      backupPath: '',
    },
  });

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pharmax_app_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = async (section) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      localStorage.setItem('pharmax_app_settings', JSON.stringify(settings));
      setMessage({ type: 'success', text: `${section} configuration saved.` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleSelectDirectory = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      updateField('system', 'backupPath', path);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Business', icon: Store },
    { id: 'system', label: 'System', icon: Bell },
    { id: 'invoicing', label: 'Invoicing', icon: FileText },
    { id: 'printing', label: 'Printing', icon: Printer },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'data', label: 'Maintenance', icon: Database },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] dark:bg-zinc-950 font-sans selection:bg-blue-100 overflow-hidden">
      {/* Slick Top Header */}
      <header className="px-10 pt-10 pb-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
              <SettingsIcon size={12} strokeWidth={3} />
              Workstation Settings
            </div>
            <h1 className="text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">
              Control <span className="text-blue-600">Panel.</span>
            </h1>
          </div>

          <Button
            onClick={() => handleSave(tabs.find((t) => t.id === activeTab)?.label)}
            disabled={isLoading}
            className="bg-zinc-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white h-12 px-10 rounded-2xl font-black shadow-2xl shadow-blue-500/10 transition-all active:scale-95 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                <span>Sync Configuration</span>
              </>
            )}
          </Button>
        </div>

        {/* Slick Tab Navigation (Horizontal) */}
        <div className="max-w-6xl mx-auto mt-12 flex items-center gap-1 p-1 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm backdrop-blur-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black transition-all duration-500 group relative ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-blue-600 shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="tracking-tight uppercase text-[11px] tracking-[0.05em]">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-10 pb-32 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* BUSINESS SECTION */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Business Identity
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Set your pharmacy credentials. This data will be synchronized across all
                    generated bills and reports.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    {[
                      { label: 'Pharmacy Name', field: 'name', cat: 'profile' },
                      { label: 'Support Email', field: 'email', cat: 'profile' },
                      { label: 'Contact Phone', field: 'phone', cat: 'profile' },
                      { label: 'Drug License', field: 'drugLicense', cat: 'profile' },
                      { label: 'Physical Address', field: 'address', cat: 'profile', full: true },
                      { label: 'STRN (Sales Tax)', field: 'strn', cat: 'profile' },
                      { label: 'NTN (Income Tax)', field: 'ntn', cat: 'profile' },
                    ].map((item) => (
                      <div
                        key={item.field}
                        className={`space-y-2 ${item.full ? 'md:col-span-2' : ''}`}
                      >
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                          {item.label}
                        </Label>
                        <Input
                          value={settings[item.cat][item.field]}
                          onChange={(e) => updateField(item.cat, item.field, e.target.value)}
                          className="h-14 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:ring-0 focus:border-blue-600 rounded-2xl font-bold transition-all text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SYSTEM SECTION */}
            {activeTab === 'system' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    System Workflow
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Fine-tune how the workstation behaves, from visual themes to automated data
                    protection routines.
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Toggles */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-8 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                            Interface
                          </p>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                            Dark Mode
                          </p>
                        </div>
                        <Toggle
                          checked={settings.system.darkMode}
                          onCheckedChange={(checked) => {
                            updateField('system', 'darkMode', checked);
                            if (checked) document.documentElement.classList.add('dark');
                            else document.documentElement.classList.remove('dark');
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                            Feedback
                          </p>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                            Audio Alerts
                          </p>
                        </div>
                        <Toggle
                          checked={settings.system.notificationSound}
                          onCheckedChange={(checked) =>
                            updateField('system', 'notificationSound', checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-8 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                          Security
                        </p>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                          Desktop Notifications
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Critical stock & expiry alerts.
                        </p>
                      </div>
                      <Toggle
                        checked={settings.system.notifications}
                        onCheckedChange={(checked) =>
                          updateField('system', 'notifications', checked)
                        }
                      />
                    </div>
                  </div>

                  {/* Backup Card */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-2xl">
                          <HardDrive size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                            Automated Cloud-Local Backup
                          </h4>
                          <p className="text-sm text-zinc-500 font-medium italic">
                            Your data is your most valuable asset.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={settings.system.autoBackup}
                        onCheckedChange={(checked) => updateField('system', 'autoBackup', checked)}
                      />
                    </div>

                    {settings.system.autoBackup && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-6 duration-500">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                            Archive Frequency
                          </Label>
                          <Select
                            value={settings.system.backupFrequency}
                            onValueChange={(val) => updateField('system', 'backupFrequency', val)}
                          >
                            <SelectTrigger className="h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl font-black px-6 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-zinc-200 shadow-2xl">
                              <SelectItem value="daily" className="font-bold py-3">
                                Every Day (Recommended)
                              </SelectItem>
                              <SelectItem value="weekly" className="font-bold py-3">
                                Once a Week
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                            Destination Directory
                          </Label>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-2xl h-14 px-6 flex items-center overflow-hidden">
                              <span className="text-xs text-zinc-400 truncate font-mono font-bold">
                                {settings.system.backupPath || 'SELECT_STORAGE_TARGET'}
                              </span>
                            </div>
                            <Button
                              onClick={handleSelectDirectory}
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 rounded-2xl px-5 h-14 shadow-sm"
                            >
                              <FolderOpen size={20} className="text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* INVOICING SECTION */}
            {activeTab === 'invoicing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Bill Engineering
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Customize the professional appearance of your invoices, including tax labels and
                    legal disclaimers.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Invoice Prefix
                      </Label>
                      <Input
                        value={settings.invoicing.prefix}
                        onChange={(e) => updateField('invoicing', 'prefix', e.target.value)}
                        className="h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl font-black text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Tax Rate (%)
                      </Label>
                      <Input
                        type="number"
                        value={settings.invoicing.defaultTax}
                        onChange={(e) => updateField('invoicing', 'defaultTax', e.target.value)}
                        className="h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl font-black text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Currency
                      </Label>
                      <Input
                        value={settings.invoicing.currency}
                        onChange={(e) => updateField('invoicing', 'currency', e.target.value)}
                        className="h-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl font-black text-center"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Invoice Footer Disclaimer
                      </Label>
                      <textarea
                        value={settings.invoicing.footerMsg}
                        onChange={(e) => updateField('invoicing', 'footerMsg', e.target.value)}
                        className="w-full h-32 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-[24px] border-none text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HARDWARE SECTION */}
            {activeTab === 'printing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Hardware Engine
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Connect and calibrate your POS hardware for instant, reliable thermal or
                    standard printing.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { id: 'thermal', label: 'POS Thermal', sub: 'Roll-fed paper', icon: Layout },
                      {
                        id: 'a4',
                        label: 'Standard Desktop',
                        sub: 'A4 / A5 Sheets',
                        icon: FileText,
                      },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => updateField('printing', 'type', p.id)}
                        className={`p-8 rounded-[32px] border-2 transition-all flex items-center gap-6 group ${
                          settings.printing.type === p.id
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-2xl shadow-blue-500/10'
                            : 'border-zinc-50 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/30'
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                            settings.printing.type === p.id
                              ? 'bg-blue-600 text-white scale-110'
                              : 'bg-white dark:bg-zinc-700 text-zinc-400 group-hover:text-zinc-900'
                          }`}
                        >
                          <p.icon size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-xs tracking-widest">
                            {p.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold mt-0.5 italic">
                            {p.sub}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Assigned Device Name
                    </Label>
                    <div className="relative">
                      <Printer
                        size={18}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <Input
                        value={settings.printing.printerName}
                        onChange={(e) => updateField('printing', 'printerName', e.target.value)}
                        className="h-16 pl-14 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl font-black text-lg"
                        placeholder="e.g. POS-80-V2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY SECTION */}
            {activeTab === 'security' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Access Control
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Protect your workstation from unauthorized access. Change your PIN or manage
                    team roles.
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/60 dark:border-zinc-800 p-8 flex items-center justify-between group hover:border-blue-300 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center transition-all group-hover:scale-110 duration-500 group-hover:bg-blue-600 group-hover:text-white">
                        <UserCog size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase text-xs">
                          Workstation Password
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-bold mt-1">
                          Update your primary admin login key.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase tracking-[0.2em] px-8 h-12 rounded-2xl"
                    >
                      Modify PIN
                    </Button>
                  </div>

                  <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-[32px] border border-transparent p-8 flex items-center justify-between opacity-50 grayscale cursor-not-allowed">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                        <ShieldCheck size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-400 tracking-tight uppercase text-xs">
                          Multi-Role Licensing
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1 tracking-tight">
                          Advanced permission sets for cashiers & managers.
                        </p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-zinc-400 border border-zinc-300 px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Enterprise Only
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MAINTENANCE SECTION */}
            {activeTab === 'data' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-2xl font-black text-red-600 tracking-tight">
                    System Integrity
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Critical operations to reset your environment. This should only be used by
                    technical personnel.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[32px] border border-red-100 dark:border-red-900/20 p-10">
                  <div className="p-8 rounded-[32px] bg-red-50/30 dark:bg-red-900/5 flex items-center justify-between border border-red-100/50">
                    <div className="space-y-1">
                      <h4 className="font-black text-red-900 dark:text-red-400 uppercase tracking-widest text-[10px]">
                        Hard Factory Reset
                      </h4>
                      <p className="text-xs text-red-600/70 dark:text-red-400/50 font-bold max-w-sm leading-relaxed">
                        Immediately wipe all local UI settings, themes, and printer links. Database
                        records are unaffected.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        if (window.confirm('Perform hard reset? This cannot be undone.')) {
                          localStorage.removeItem('pharmax_app_settings');
                          window.location.reload();
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 rounded-2xl shadow-2xl shadow-red-500/20"
                    >
                      <Trash2 size={20} /> Wipe System Cache
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Persistence Notifications */}
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}
    </div>
  );
}
