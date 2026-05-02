import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sun
} from "lucide-react";

// --- Custom Toggle Component (Replacing Switch) ---
function Toggle({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-blue-500 ${
        checked ? 'bg-blue-600' : 'bg-zinc-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Toast Component (Pharmax Standard) ---
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-5 duration-300
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState({
    profile: {
      name: "Pharmax Solutions",
      email: "contact@pharmax.com",
      phone: "+92 300 1234567",
      address: "123 Health Street, Lahore, Pakistan",
      drapLicense: "DL-12345-X",
      drugLicense: "LHR-9988-24",
      strn: "1234567-8",
      ntn: "9876543-2"
    },
    invoicing: {
      prefix: "INV-",
      footerMsg: "Medicines once sold will not be returned or exchanged without original bill.",
      defaultTax: "0",
      currency: "Rs",
    },
    printing: {
      type: "thermal",
      printerName: "Default POS Printer",
      paperSize: "80mm"
    },
    system: {
      notifications: true,
      notificationSound: true,
      darkMode: false,
      autoBackup: false,
      backupFrequency: "daily",
      backupPath: ""
    }
  });

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pharmax_app_settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = async (section) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); 
      localStorage.setItem("pharmax_app_settings", JSON.stringify(settings));
      setMessage({ type: "success", text: `${section} updated successfully!` });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSelectDirectory = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      updateField('system', 'backupPath', path);
    }
  };

  const tabs = [
    { id: "profile", label: "Pharmacy Profile", icon: Store },
    { id: "system", label: "System & Preferences", icon: Bell },
    { id: "invoicing", label: "Invoicing & Tax", icon: FileText },
    { id: "printing", label: "Printing Setup", icon: Printer },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "data", label: "System Data", icon: Database },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50/50">
      {/* Premium Header */}
      <div className="px-8 py-6 border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-blue-200 shadow-xl border-4 border-blue-50">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">System Configuration</h1>
              <p className="text-sm text-zinc-500 font-medium">Manage your pharmacy identity, hardware, and operational rules.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full max-w-7xl mx-auto">
          
          {/* Vertical Navigation Sidebar */}
          <aside className="w-72 bg-white border-r border-zinc-200 p-6 space-y-2 hidden md:block">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100 translate-x-1"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Dynamic Content Area */}
          <main className="flex-1 overflow-auto p-8 lg:p-12">
            <div className="max-w-3xl">
              
              {/* PHARMACY PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Pharmacy Profile</h2>
                      <p className="text-sm text-zinc-500">Identity shown on patient bills and supplier reports.</p>
                    </div>
                    <Button 
                      onClick={() => handleSave("Pharmacy Profile")} 
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 shadow-md h-10 px-6 gap-2"
                    >
                      <Save size={18} /> {isLoading ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Business Name</Label>
                        <Input 
                          value={settings.profile.name} 
                          onChange={e => updateField('profile', 'name', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Address</Label>
                        <Input 
                          value={settings.profile.email} 
                          onChange={e => updateField('profile', 'email', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Phone / Mobile</Label>
                        <Input 
                          value={settings.profile.phone} 
                          onChange={e => updateField('profile', 'phone', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pharmacy License No.</Label>
                        <Input 
                          value={settings.profile.drugLicense} 
                          onChange={e => updateField('profile', 'drugLicense', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Full Shop Address</Label>
                        <Input 
                          value={settings.profile.address} 
                          onChange={e => updateField('profile', 'address', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">STRN (Sales Tax ID)</Label>
                        <Input 
                          value={settings.profile.strn} 
                          onChange={e => updateField('profile', 'strn', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">NTN (Income Tax ID)</Label>
                        <Input 
                          value={settings.profile.ntn} 
                          onChange={e => updateField('profile', 'ntn', e.target.value)}
                          className="h-12 border-zinc-200 focus:border-blue-500 bg-zinc-50/30" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SYSTEM & PREFERENCES TAB */}
              {activeTab === "system" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">System & Preferences</h2>
                      <p className="text-sm text-zinc-500">Configure notifications, interface theme, and automation.</p>
                    </div>
                    <Button onClick={() => handleSave("System")} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 h-10 px-6 gap-2">
                      <Save size={18} /> Save Preferences
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Notifications Section */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                        <Bell size={18} className="text-amber-500" />
                        <h3 className="font-bold text-zinc-900">Notifications</h3>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-zinc-700">Desktop Notifications</Label>
                            <p className="text-xs text-zinc-500">Show system alerts for low stock and expiry events.</p>
                          </div>
                          <Toggle
                            checked={settings.system.notifications}
                            onCheckedChange={(checked) => updateField('system', 'notifications', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-bold text-zinc-700">Alert Sounds</Label>
                              {settings.system.notificationSound ? <Volume2 size={14} className="text-zinc-400" /> : <VolumeX size={14} className="text-zinc-400" />}
                            </div>
                            <p className="text-xs text-zinc-500">Play a sound when a new notification arrives.</p>
                          </div>
                          <Toggle
                            checked={settings.system.notificationSound}
                            onCheckedChange={(checked) => updateField('system', 'notificationSound', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Auto Backup Section */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                        <FolderOpen size={18} className="text-blue-500" />
                        <h3 className="font-bold text-zinc-900">Automated Backup</h3>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-zinc-700">Enable Auto-Backup</Label>
                            <p className="text-xs text-zinc-500">Automatically backup your database to a local directory.</p>
                          </div>
                          <Toggle
                            checked={settings.system.autoBackup}
                            onCheckedChange={(checked) => updateField('system', 'autoBackup', checked)}
                          />
                        </div>

                        {settings.system.autoBackup && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Backup Frequency</Label>
                              <Select 
                                value={settings.system.backupFrequency} 
                                onValueChange={(val) => updateField('system', 'backupFrequency', val)}
                              >
                                <SelectTrigger className="w-full bg-zinc-50 border-zinc-200 rounded-xl h-11 font-medium">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Every Day</SelectItem>
                                  <SelectItem value="weekly">Once a Week</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Storage Folder</Label>
                              <div className="flex gap-2">
                                <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 flex items-center overflow-hidden">
                                  <span className="text-[10px] text-zinc-500 truncate font-mono">
                                    {settings.system.backupPath || 'No folder selected'}
                                  </span>
                                </div>
                                <Button 
                                  variant="outline" 
                                  onClick={handleSelectDirectory}
                                  className="border-zinc-200 hover:bg-zinc-100 rounded-xl px-3 h-11"
                                >
                                  <FolderOpen size={18} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Theme Section */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-colors ${settings.system.darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-orange-50 text-orange-600'}`}>
                          {settings.system.darkMode ? <Moon size={22} /> : <Sun size={22} />}
                        </div>
                        <div>
                          <Label className="text-sm font-bold text-zinc-900">Dark Mode Interface</Label>
                          <p className="text-xs text-zinc-500">Enable high-contrast dark theme for the entire app.</p>
                        </div>
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
                  </div>
                </div>
              )}

              {/* INVOICING TAB */}
              {activeTab === "invoicing" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Invoicing & Taxation</h2>
                      <p className="text-sm text-zinc-500">Control how your bills look and taxes are applied.</p>
                    </div>
                    <Button onClick={() => handleSave("Invoicing")} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 h-10 px-6 gap-2">
                      <Save size={18} /> Save Config
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Bill Prefix (e.g., INV-)</Label>
                          <Input 
                            value={settings.invoicing.prefix} 
                            onChange={e => updateField('invoicing', 'prefix', e.target.value)}
                            className="h-12 border-zinc-200" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Default GST (%)</Label>
                          <Input 
                            type="number"
                            value={settings.invoicing.defaultTax} 
                            onChange={e => updateField('invoicing', 'defaultTax', e.target.value)}
                            className="h-12 border-zinc-200" 
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Currency Symbol</Label>
                          <Input 
                            value={settings.invoicing.currency} 
                            onChange={e => updateField('invoicing', 'currency', e.target.value)}
                            className="h-12 border-zinc-200" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Terms & Conditions (Footer)</Label>
                          <textarea 
                            value={settings.invoicing.footerMsg} 
                            onChange={e => updateField('invoicing', 'footerMsg', e.target.value)}
                            className="w-full h-32 p-4 rounded-xl border border-zinc-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRINTING SETUP TAB */}
              {activeTab === "printing" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Printing Setup</h2>
                      <p className="text-sm text-zinc-500">Select your hardware and customize print layouts.</p>
                    </div>
                    <Button onClick={() => handleSave("Printing")} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 h-10 px-6 gap-2">
                      <Save size={18} /> Save Printer
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => updateField('printing', 'type', 'thermal')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-3 ${
                          settings.printing.type === 'thermal' ? "border-blue-600 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          settings.printing.type === 'thermal' ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"
                        }`}>
                          <Printer size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">POS Thermal</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">80mm / 58mm</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => updateField('printing', 'type', 'a4')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-3 ${
                          settings.printing.type === 'a4' ? "border-blue-600 bg-blue-50" : "border-zinc-100 bg-zinc-50 opacity-60"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          settings.printing.type === 'a4' ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"
                        }`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">Standard A4/A5</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">Office Printers</p>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">System Printer Name</Label>
                      <Input 
                        value={settings.printing.printerName} 
                        onChange={e => updateField('printing', 'printerName', e.target.value)}
                        className="h-12 border-zinc-200" 
                        placeholder="e.g. XP-80C Thermal Printer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-bold text-zinc-900 mb-8">Security & Access Control</h2>
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-zinc-200 transition-all cursor-pointer group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ShieldCheck size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">Administrator Password</h4>
                          <p className="text-xs text-zinc-500">Update your primary login credentials.</p>
                        </div>
                      </div>
                      <Button variant="outline" className="border-zinc-200 font-bold px-6">Change</Button>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-2xl border border-zinc-100 bg-zinc-50/50 opacity-60 grayscale cursor-not-allowed">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center">
                          <CreditCard size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">User Multi-Role</h4>
                          <p className="text-xs text-zinc-500 italic">Available in Enterprise Edition</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase bg-zinc-200 px-3 py-1 rounded-full">Pro Only</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DATA MANAGEMENT TAB */}
              {activeTab === "data" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-bold text-red-600 mb-8">Critical Data Operations</h2>
                  <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 space-y-4">
                    <div className="p-6 rounded-2xl border border-red-100 bg-red-50/30 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-red-900">Reset Local Configuration</h4>
                        <p className="text-xs text-red-600/70 font-medium">This will clear your logo, printer settings, and local cache.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if(window.confirm("Are you sure you want to reset all settings to default?")) {
                            localStorage.removeItem("pharmax_app_settings");
                            window.location.reload();
                          }
                        }}
                        className="border-red-200 text-red-600 hover:bg-red-100 font-bold gap-2 px-6"
                      >
                        <Trash2 size={18} /> Wipe Cache
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <Toast 
          message={message.text} 
          type={message.type} 
          onClose={() => setMessage(null)} 
        />
      )}
    </div>
  );
}
