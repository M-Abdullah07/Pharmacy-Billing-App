import { dialog, app } from "electron";
import fs from "fs";
import path from "path";

export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("backup-database", async () => {
    try {
      const tables = ["users", "products", "categories", "suppliers", "customers", "batches", "stock_movements", "sale_invoices", "sale_invoice_items"];
      const backupData = {};
      for (const t of tables) {
        const rows = await queryDb(`SELECT * FROM ${t}`);
        backupData[t] = rows;
      }
  
      const { filePath } = await dialog.showSaveDialog({
        title: "Save Database Backup",
        defaultPath: path.join(app.getPath("documents"), `pharmax_backup_${new Date().getTime()}.json`),
        filters: [{ name: "JSON Data", extensions: ["json"] }]
      });
  
      if (filePath) {
        const fs = require('fs');
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
        return { success: true, path: filePath };
      }
      return { success: false, error: "Backup cancelled" };
    } catch (err) {
      console.error("❌ backup-database error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("export-to-csv", async (event, { table, filename }) => {
    try {
      // Map internal table names if needed
      let dbTable = table;
      if (table === "sales") dbTable = "sale_invoices";
  
      const rows = await queryDb(`SELECT * FROM ${dbTable}`);
      if (rows.length === 0) return { success: false, error: "No data found to export" };
  
      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(","),
        ...rows.map(row => headers.map(h => {
          const val = row[h] === null ? "" : row[h];
          return `"${val.toString().replace(/"/g, '""')}"`;
        }).join(","))
      ].join("\n");
  
      const { filePath } = await dialog.showSaveDialog({
        title: `Export ${table} Data`,
        defaultPath: path.join(app.getPath("downloads"), filename),
        filters: [{ name: "CSV Files", extensions: ["csv"] }]
      });
  
      if (filePath) {
        const fs = require('fs');
        fs.writeFileSync(filePath, csvContent);
        return { success: true, path: filePath };
      }
      return { success: false, error: "Export cancelled" };
    } catch (err) {
      console.error("❌ export-to-csv error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("query-db", async (event, sql, params) => {
    try {
      return await queryDb(sql, params);
    } catch (err) {
      console.error("❌ query-db error:", err.message);
      throw err;
    }
  });

  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("get-dashboard-stats", async () => {
    try {
      const [saleData, profitData, outOfStockData, expiryData] = await Promise.all([
        queryDb(
          `SELECT COALESCE(SUM(net_receivable), 0) AS total_sale
           FROM sale_invoices WHERE status = 'confirmed'`
        ),
        queryDb(
          `SELECT COALESCE(SUM((si.sale_rate - b.purchase_cost_per_unit) * si.quantity), 0) AS total_profit
           FROM sale_invoice_items si
           JOIN batches b ON si.batch_id = b.batch_id
           JOIN sale_invoices inv ON si.sale_invoice_id = inv.sale_invoice_id
           WHERE inv.status = 'confirmed'`
        ),
        queryDb(
          `SELECT COUNT(*) AS out_of_stock
           FROM products p
           WHERE p.is_active = TRUE
             AND (SELECT COALESCE(SUM(quantity_available), 0)
                  FROM batches b
                  WHERE b.product_id = p.product_id AND b.is_active = TRUE) = 0`
        ),
        queryDb(
          `SELECT
             COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 1 AND 30)  AS critical,
             COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 31 AND 60) AS warning,
             COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 61 AND 90) AS watch
           FROM batches
           WHERE is_active = TRUE AND quantity_available > 0`
        )
      ]);
      return { saleData, profitData, outOfStockData, expiryData };
    } catch (err) {
      console.error("❌ get-dashboard-stats error:", err.message);
      return { saleData: [], profitData: [], outOfStockData: [], expiryData: [] };
    }
  });

  ipcMain.handle("get-near-expiry-stats", async (event, crit, warn, watch) => {
    try {
      return await queryDb(
        `SELECT
           COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 1 AND $1)  AS critical,
           COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN $1+1 AND $2) AS warning,
           COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN $2+1 AND $3) AS watch
         FROM batches
         WHERE is_active = TRUE AND quantity_available > 0`,
        [crit, warn, watch]
      );
    } catch (err) {
      console.error("❌ get-near-expiry-stats error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-analytics-chart-data", async () => {
    try {
      return await queryDb(`
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                date_trunc('month', CURRENT_DATE),
                '1 month'
            ) AS month
        )
        SELECT
            to_char(m.month, 'FMMonth') AS month,
            COALESCE(SUM(s.net_receivable), 0) AS sales,
            COALESCE(SUM(p.net_payable), 0) AS purchases
        FROM months m
        LEFT JOIN sale_invoices s ON date_trunc('month', s.invoice_date) = m.month AND s.status = 'confirmed'
        LEFT JOIN purchase_invoices p ON date_trunc('month', p.invoice_date) = m.month AND p.status = 'confirmed'
        GROUP BY m.month
        ORDER BY m.month
      `);
    } catch (err) {
      console.error("❌ get-analytics-chart-data error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-activity-list", async () => {
    try {
      return await queryDb(`
        (
          SELECT 'Sale' AS type,
                 c.name AS name,
                 s_inv.invoice_number AS id,
                 s_inv.created_at AS time,
                 s_inv.status AS status
          FROM sale_invoices s_inv
          JOIN customers c ON s_inv.customer_id = c.customer_id
        )
        UNION ALL
        (
          SELECT 'Purchase' AS type,
                 sup.name AS name,
                 p_inv.invoice_number AS id,
                 p_inv.created_at AS time,
                 p_inv.status AS status
          FROM purchase_invoices p_inv
          JOIN suppliers sup ON p_inv.supplier_id = sup.supplier_id
        )
        UNION ALL
        (
          SELECT 'Sale Return' AS type,
                 c.name AS name,
                 s_ret.return_id::text AS id,
                 s_ret.created_at AS time,
                 s_ret.status AS status
          FROM sale_returns s_ret
          JOIN customers c ON s_ret.customer_id = c.customer_id
        )
        UNION ALL
        (
          SELECT 'Purchase Return' AS type,
                 sup.name AS name,
                 p_ret.return_id::text AS id,
                 p_ret.created_at AS time,
                 p_ret.status AS status
          FROM purchase_returns p_ret
          JOIN suppliers sup ON p_ret.supplier_id = sup.supplier_id
        )
        UNION ALL
        (
          SELECT 
            CASE WHEN pay.direction = 'received' THEN 'Payment Received' ELSE 'Payment Paid' END AS type,
            COALESCE(c.name, s.name) AS name,
            pay.payment_id::text AS id,
            pay.created_at AS time,
            'confirmed' AS status
          FROM payments pay
          LEFT JOIN customers c ON pay.party_id = c.customer_id AND pay.direction = 'received'
          LEFT JOIN suppliers s ON pay.party_id = s.supplier_id AND pay.direction = 'paid'
        )
        UNION ALL
        (
          SELECT 'Expense' AS type,
                 e.description AS name,
                 e.expense_id::text AS id,
                 e.created_at AS time,
                 'confirmed' AS status
          FROM expenses e
        )
        ORDER BY time DESC
        LIMIT 10
      `);
    } catch (err) {
      console.error("❌ get-activity-list error:", err.message);
      return [];
    }
  });
}
