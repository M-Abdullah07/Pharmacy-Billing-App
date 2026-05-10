
export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("get-outstanding-payables", async () => {
    try {
      return await queryDb(`
        SELECT s.supplier_id, s.name, s.city, s.payment_terms, s.credit_period_days, v.outstanding_payable AS payable_balance
        FROM suppliers s
        JOIN v_supplier_ap v ON s.supplier_id = v.supplier_id
        WHERE s.is_active = TRUE AND v.outstanding_payable > 0
        ORDER BY v.outstanding_payable DESC
      `);
    } catch (err) {
      console.error("❌ get-outstanding-payables error:", err.message);
      return [];
    }
  });

  ipcMain.handle("record-supplier-payment", async (event, data) => {
    try {
      const { supplierId, amount, paymentMode, referenceNo, notes, userId } = data;

      await runDb(`
        INSERT INTO payments (direction, party_id, amount, mode, reference_no, notes, created_by)
        VALUES ('paid', $1, $2, $3, $4, $5, $6)
      `, [
        supplierId, 
        amount, 
        paymentMode || 'cash', 
        referenceNo || 'Lump Sum Payment', 
        notes || 'Payment against outstanding balance', 
        userId
      ]);

      return { success: true };
    } catch (err) {
      console.error("❌ record-supplier-payment error:", err.message);
      return { success: false, error: err.message };
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

  // ── Customer AR (Accounts Receivable) ───────────────────────────────────

  ipcMain.handle("get-outstanding-receivables", async () => {
    try {
      return await queryDb(`
        SELECT customer_id, customer_name, territory, outstanding_balance, 
               bucket_0_30, bucket_31_60, bucket_61_90, bucket_90_plus
        FROM v_customer_ar
        WHERE outstanding_balance > 0
        ORDER BY outstanding_balance DESC
      `);
    } catch (err) {
      console.error("❌ get-outstanding-receivables error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-customer-ledger", async (event, customerId, startDate, endDate) => {
    try {
      let dateFilter = "";
      const params = [customerId];
      let paramIndex = 2;
  
      if (startDate) {
        dateFilter += ` AND date >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND date <= $${paramIndex++}`;
        params.push(endDate);
      }
  
      const sql = `
        SELECT * FROM (
          -- Sales
          SELECT sale_invoice_id AS id, invoice_date AS date, 'Sale' AS type,
                 invoice_number AS reference, net_receivable AS debit, 0 AS credit, notes
          FROM sale_invoices
          WHERE customer_id = $1 AND status = 'confirmed'
  
          UNION ALL
  
          -- Returns (from customer)
          SELECT return_id AS id, return_date AS date, 'Return' AS type,
                 '' AS reference, 0 AS debit, total_credit AS credit, notes
          FROM sale_returns
          WHERE customer_id = $1 AND status = 'confirmed'
  
          UNION ALL
  
          -- Payments (Received from Customer)
          SELECT payment_id AS id, payment_date AS date, 'Payment' AS type,
                 reference_no AS reference, 0 AS debit, amount AS credit, notes
          FROM payments
          WHERE party_id = $1 AND direction = 'received'
        ) AS ledger
        WHERE 1=1 ${dateFilter}
        ORDER BY date ASC
      `;
      return await queryDb(sql, params);
    } catch (err) {
      console.error("❌ get-customer-ledger error:", err.message);
      return [];
    }
  });

  ipcMain.handle("record-customer-payment", async (event, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { customerId, amount, paymentMode, referenceNo, notes, userId } = data;
      let remainingAmount = Number(amount);

      // Insert the general payment record
      await client.query(`
        INSERT INTO payments (direction, party_id, amount, mode, reference_no, notes, created_by)
        VALUES ('received', $1, $2, $3, $4, $5, $6)
      `, [
        customerId, 
        amount, 
        paymentMode || 'cash', 
        referenceNo || 'Lump Sum Payment', 
        notes || 'Payment against account balance', 
        userId
      ]);

      // FIFO Allocation: Get all unpaid confirmed invoices for this customer, oldest first
      const unpaidInvoices = await client.query(`
        SELECT sale_invoice_id, balance_due
        FROM sale_invoices
        WHERE customer_id = $1 AND status = 'confirmed' AND balance_due > 0
        ORDER BY invoice_date ASC, created_at ASC
      `, [customerId]);

      // Distribute payment across oldest invoices
      for (const inv of unpaidInvoices.rows) {
        if (remainingAmount <= 0) break;
        
        const balanceDue = Number(inv.balance_due);
        const amountToApply = Math.min(balanceDue, remainingAmount);
        
        await client.query(`
          UPDATE sale_invoices
          SET amount_paid = amount_paid + $1,
              updated_at = now()
          WHERE sale_invoice_id = $2
        `, [amountToApply, inv.sale_invoice_id]);

        remainingAmount -= amountToApply;
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ record-customer-payment error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  });
}
