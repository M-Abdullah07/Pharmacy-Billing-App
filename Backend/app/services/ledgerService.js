
export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("get-outstanding-payables", async () => {
    try {
      return await queryDb(`
        SELECT supplier_id, name, city, opening_balance AS payable_balance, payment_terms, credit_period_days
        FROM suppliers
        WHERE is_active = TRUE AND opening_balance > 0
        ORDER BY opening_balance DESC
      `);
    } catch (err) {
      console.error("❌ get-outstanding-payables error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-supplier-ledger", async (event, supplierId, startDate, endDate) => {
    try {
      let dateFilter = "";
      const params = [supplierId];
      let paramIndex = 2;
  
      if (startDate) {
        dateFilter += ` AND date >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND date <= $${paramIndex++}`;
        params.push(endDate);
      }
  
      // Combine Opening Balance + Purchase Invoices + Payments (Paid to Supplier) + Returns
      // This is a simplified ledger view query
      const sql = `
        SELECT * FROM (
          -- Purchases
          SELECT purchase_invoice_id AS id, invoice_date AS date, 'Purchase' AS type,
                 invoice_number AS reference, net_payable AS credit, 0 AS debit, notes
          FROM purchase_invoices
          WHERE supplier_id = $1 AND status = 'confirmed'
  
          UNION ALL
  
          -- Returns
          SELECT return_id AS id, return_date AS date, 'Return' AS type,
                 '' AS reference, 0 AS credit, total_credit AS debit, notes
          FROM purchase_returns
          WHERE supplier_id = $1 AND status = 'confirmed'
  
          UNION ALL
  
          -- Payments
          SELECT payment_id AS id, payment_date AS date, 'Payment' AS type,
                 reference_no AS reference, 0 AS credit, amount AS debit, notes
          FROM payments
          WHERE party_id = $1 AND direction = 'paid'
        ) AS ledger
        WHERE 1=1 ${dateFilter}
        ORDER BY date ASC
      `;
      return await queryDb(sql, params);
    } catch (err) {
      console.error("❌ get-supplier-ledger error:", err.message);
      return [];
    }
  });
}
