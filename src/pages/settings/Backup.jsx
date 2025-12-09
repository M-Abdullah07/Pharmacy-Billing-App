import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { PageContainer, PageSection, MessageAlert } from "@/components/PageLayout";

export default function Backup() {
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electron.ipcRenderer.invoke("backup-database");

      if (result.success) {
        setMessage({
          type: "success",
          text: `Database backed up successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Backup failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error creating backup: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSales = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electron.ipcRenderer.invoke("export-to-csv", {
        table: "sales",
        filename: `sales-export-${new Date().toISOString().split("T")[0]}.csv`,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Sales data exported successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Export failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error exporting data: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCustomers = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electron.ipcRenderer.invoke("export-to-csv", {
        table: "customers",
        filename: `customers-export-${new Date().toISOString().split("T")[0]}.csv`,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Customer data exported successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Export failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error exporting data: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportProducts = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const result = await window.electron.ipcRenderer.invoke("export-to-csv", {
        table: "products",
        filename: `products-export-${new Date().toISOString().split("T")[0]}.csv`,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Product data exported successfully to: ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Export failed: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error exporting data: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer
      title="Backup & Export"
      description="Backup your database and export data for analysis"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Database Backup */}
      <PageSection
        title="Database Backup"
        description="Create a complete backup of your pharmacy database"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Full Database Backup</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Creates a complete copy of your database including all sales,
                customers, products, and batches. This file can be used to
                restore your data in case of any issues.
              </p>
              <Button onClick={handleBackup} disabled={isLoading}>
                <Download size={16} className="mr-2" />
                {isLoading ? "Creating Backup..." : "Create Backup"}
              </Button>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Database size={18} />
              Backup Tips
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Create regular backups to prevent data loss</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Store backups in a safe location (external drive, cloud)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Test your backups periodically to ensure they work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Keep multiple backup versions for safety</span>
              </li>
            </ul>
          </div>
        </div>
      </PageSection>

      {/* Export Data */}
      <PageSection
        title="Export Data to CSV"
        description="Export specific data tables to CSV format for analysis"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg space-y-3 hover:border-primary transition-colors">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Database size={20} />
              <h4 className="font-semibold">Sales Data</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Export all sales transactions with customer details
            </p>
            <Button
              onClick={handleExportSales}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Download size={16} className="mr-2" />
              Export Sales
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-3 hover:border-primary transition-colors">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Database size={20} />
              <h4 className="font-semibold">Customers</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Export customer list with contact information
            </p>
            <Button
              onClick={handleExportCustomers}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Download size={16} className="mr-2" />
              Export Customers
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-3 hover:border-primary transition-colors">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Database size={20} />
              <h4 className="font-semibold">Products</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Export product catalog with pricing details
            </p>
            <Button
              onClick={handleExportProducts}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Download size={16} className="mr-2" />
              Export Products
            </Button>
          </div>
        </div>
      </PageSection>

      {/* Restore Information */}
      <PageSection
        title="Restore Database"
        description="Restore your database from a backup file"
      >
        <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Important Information
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                To restore from a backup, please close the application and replace
                the <code className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded text-xs font-mono">pharmacy.db</code> file
                in the application directory with your backup file.
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Make sure to create a backup of your current database before
                restoring to avoid data loss.
              </p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageContainer>
  );
}
