import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Users,
  Package,
  History,
  X
} from "lucide-react";

// --- Toast Component (Consistent with Settings.jsx) ---
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
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

export default function Backup() {
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electronAPI.backupDatabase();

      if (result.success) {
        setMessage({
          type: "success",
          text: `Database backed up successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error === "Backup cancelled" ? "Operation cancelled" : "Backup failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error creating backup: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (table, label) => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electronAPI.exportToCsv({
        table: table,
        filename: `${table}-export-${new Date().toISOString().split("T")[0]}.csv`,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `${label} exported successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error === "Export cancelled" ? "Operation cancelled" : "Export failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error exporting data: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-auto bg-zinc-50/50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Backup & Data Export</h1>
        <p className="text-sm text-zinc-500 mt-1">Protect your pharmacy data by creating regular backups and exporting reports for analysis.</p>
      </div>

      <div className="max-w-4xl space-y-8 pb-10">
        
        {/* Full Database Backup Card */}
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Database Snapshot</h2>
                <p className="text-xs text-zinc-500">Create a full portable backup of your entire system.</p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={handleBackup} 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6 h-11 shadow-sm"
            >
              <Download size={18} />
              {isLoading ? "Generating..." : "Create Backup"}
            </Button>
          </div>
          
          <div className="p-6 bg-zinc-50/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <p>Regular backups prevent data loss in case of system failures.</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <p>Backup files are secure and include all pharmacy records.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CSV Export Grid */}
        <div>
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Export Modules (CSV)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sales Export */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:border-blue-300 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <History size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-1">Sales Ledger</h4>
              <p className="text-xs text-zinc-500 mb-6">Full transaction history and revenue data.</p>
              <Button 
                variant="outline" 
                className="w-full border-zinc-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                onClick={() => handleExport("sales", "Sales Data")}
                disabled={isLoading}
              >
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Customers Export */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:border-indigo-300 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-1">Customer List</h4>
              <p className="text-xs text-zinc-500 mb-6">Directory of all customers and territories.</p>
              <Button 
                variant="outline" 
                className="w-full border-zinc-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                onClick={() => handleExport("customers", "Customer List")}
                disabled={isLoading}
              >
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Products Export */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:border-purple-300 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-1">Product Catalog</h4>
              <p className="text-xs text-zinc-500 mb-6">Inventory list with pricing and batches.</p>
              <Button 
                variant="outline" 
                className="w-full border-zinc-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                onClick={() => handleExport("products", "Product Catalog")}
                disabled={isLoading}
              >
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Information / Alert Card */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm mb-1 uppercase tracking-tight">Data Security Notice</h4>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Exported CSV files contain sensitive business information. Ensure they are stored in a secure location. 
              To restore a backup, please contact system support or follow the manual recovery procedure using the JSON backup file.
            </p>
          </div>
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
