import { requireAuth } from "./session.js";
import { assertShape } from "../utils/validate.js";

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

  ipcMain.handle("record-supplier-payment", requireAuth(async (event, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      assertShape(data, { supplierId: "string", amount: "number>=0" });

      // H3: server-side session userId wins over the frontend-supplied one.
      const effectiveUserId = event.locals?.session?.userId ?? data.userId;
      const { supplierId, amount, paymentMode, referenceNo, notes } = data;
      const userId = effectiveUserId;
      let remainingAmount = Number(amount);

      // Insert the general payment record
      await client.query(`
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

      // M1: FIFO Allocation against purchase_invoices, mirroring record-customer-payment.
      // FOR UPDATE locks these invoice rows so concurrent supplier payments can't
      // double-allocate against the same balance_due (same fix as H2).
      const unpaidInvoices = await client.query(`
        SELECT purchase_invoice_id, balance_due
        FROM purchase_invoices
        WHERE supplier_id = $1 AND status = 'confirmed' AND balance_due > 0
        ORDER BY invoice_date ASC, created_at ASC
        FOR UPDATE
      `, [supplierId]);

      for (const inv of unpaidInvoices.rows) {
        if (remainingAmount <= 0) break;

        const balanceDue = Number(inv.balance_due);
        const amountToApply = Math.min(balanceDue, remainingAmount);

        await client.query(`
          UPDATE purchase_invoices
          SET amount_paid = amount_paid + $1,
              updated_at = now()
          WHERE purchase_invoice_id = $2
        `, [amountToApply, inv.purchase_invoice_id]);

        remainingAmount -= amountToApply;
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ record-supplier-payment error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }));

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
      const entries = await queryDb(sql, params);

      // M30: Seed the running balance with everything BEFORE startDate, plus the
      // supplier's onboarding opening_balance, so the frontend doesn't silently
      // start every filtered view from zero.
      let openingBalance = 0;
      const supplierRows = await queryDb(
        `SELECT opening_balance FROM suppliers WHERE supplier_id = $1`,
        [supplierId]
      );
      openingBalance += Number(supplierRows[0]?.opening_balance ?? 0);

      if (startDate) {
        const priorRows = await queryDb(
          `
          SELECT
            COALESCE(SUM(credit), 0) AS total_credit,
            COALESCE(SUM(debit), 0) AS total_debit
          FROM (
            SELECT net_payable AS credit, 0 AS debit
            FROM purchase_invoices
            WHERE supplier_id = $1 AND status = 'confirmed' AND invoice_date < $2

            UNION ALL

            SELECT 0 AS credit, total_credit AS debit
            FROM purchase_returns
            WHERE supplier_id = $1 AND status = 'confirmed' AND return_date < $2

            UNION ALL

            SELECT 0 AS credit, amount AS debit
            FROM payments
            WHERE party_id = $1 AND direction = 'paid' AND payment_date < $2
          ) AS prior
          `,
          [supplierId, startDate]
        );
        openingBalance += Number(priorRows[0].total_credit) - Number(priorRows[0].total_debit);
      }

      return { openingBalance, entries };
    } catch (err) {
      console.error("❌ get-supplier-ledger error:", err.message);
      return { openingBalance: 0, entries: [] };
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
      const entries = await queryDb(sql, params);

      // M30: Seed the running balance with everything BEFORE startDate, plus the
      // customer's onboarding opening_balance, so the frontend doesn't silently
      // start every filtered view from zero.
      let openingBalance = 0;
      const customerRows = await queryDb(
        `SELECT opening_balance FROM customers WHERE customer_id = $1`,
        [customerId]
      );
      openingBalance += Number(customerRows[0]?.opening_balance ?? 0);

      if (startDate) {
        const priorRows = await queryDb(
          `
          SELECT
            COALESCE(SUM(debit), 0) AS total_debit,
            COALESCE(SUM(credit), 0) AS total_credit
          FROM (
            SELECT net_receivable AS debit, 0 AS credit
            FROM sale_invoices
            WHERE customer_id = $1 AND status = 'confirmed' AND invoice_date < $2

            UNION ALL

            SELECT 0 AS debit, total_credit AS credit
            FROM sale_returns
            WHERE customer_id = $1 AND status = 'confirmed' AND return_date < $2

            UNION ALL

            SELECT 0 AS debit, amount AS credit
            FROM payments
            WHERE party_id = $1 AND direction = 'received' AND payment_date < $2
          ) AS prior
          `,
          [customerId, startDate]
        );
        openingBalance += Number(priorRows[0].total_debit) - Number(priorRows[0].total_credit);
      }

      return { openingBalance, entries };
    } catch (err) {
      console.error("❌ get-customer-ledger error:", err.message);
      return { openingBalance: 0, entries: [] };
    }
  });

  ipcMain.handle("record-customer-payment", requireAuth(async (event, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      assertShape(data, { customerId: "string", amount: "number>=0" });

      // H3: server-side session userId wins over the frontend-supplied one.
      const effectiveUserId = event.locals?.session?.userId ?? data.userId;
      const { customerId, amount, paymentMode, referenceNo, notes } = data;
      const userId = effectiveUserId;
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

      // FIFO Allocation: Get all unpaid confirmed invoices for this customer, oldest first.
      // FOR UPDATE locks these invoice rows for the duration of the transaction so that
      // two concurrent payments against the same customer cannot both read the same
      // balance_due and double-allocate against it (H2).
      const unpaidInvoices = await client.query(`
        SELECT sale_invoice_id, balance_due
        FROM sale_invoices
        WHERE customer_id = $1 AND status = 'confirmed' AND balance_due > 0
        ORDER BY invoice_date ASC, created_at ASC
        FOR UPDATE
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
  }));
}
