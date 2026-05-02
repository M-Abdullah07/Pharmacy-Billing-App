import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { calculateFefoPlan } from "../utils/fefoAllocator.js";

export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("add-sale", async (event, data) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      if (!data.items || data.items.length === 0) {
        throw new Error("No items in sale.");
      }
      if (!data.userId) {
        throw new Error("User ID required to confirm sale.");
      }
  
      // 1. Sort productIds for deterministic locking
      const productIds = [...new Set(data.items.map(item => item.productId))];
      productIds.sort();
  
      // 2. Lock batches for requested products using FEFO order
      const lockRes = await client.query(`
        SELECT b.batch_id, b.product_id, b.quantity_available, b.mrp,
               b.mrp as sale_rate, p.gst_rate
        FROM batches b
        JOIN products p ON p.product_id = b.product_id
        WHERE b.product_id = ANY($1::uuid[]) AND b.quantity_available > 0 AND b.is_active = TRUE
        ORDER BY b.product_id, b.expiry_date ASC
        FOR UPDATE
      `, [productIds]);
  
      // 3. Pure JS FEFO allocation
      const allocationPlan = calculateFefoPlan(data.items, lockRes.rows);
  
      // 4. Create sale invoice parent
      const invoiceResult = await client.query(`
        INSERT INTO sale_invoices
          (customer_id, invoice_date, status)
        VALUES ($1, CURRENT_DATE, 'draft')
        RETURNING sale_invoice_id, invoice_number
      `, [data.customerId]);
      const saleInvoiceId = invoiceResult.rows[0].sale_invoice_id;
      const invoiceNumber = invoiceResult.rows[0].invoice_number;
  
      // 5. Bulk insert sale invoice items delegating math to Postgres
      const itemValues = [
        allocationPlan.map(() => saleInvoiceId),
        allocationPlan.map(item => item.batch_id),
        allocationPlan.map(item => item.product_id),
        allocationPlan.map(item => item.quantity),
        allocationPlan.map(item => item.sale_rate),
        allocationPlan.map(item => item.gst_rate),
        allocationPlan.map(item => item.discountPct)
      ];
  
      await client.query(`
        INSERT INTO sale_invoice_items
           (sale_invoice_id, batch_id, product_id, quantity, mrp, sale_rate, gst_rate, discount_pct, line_total, tax_amount)
         SELECT
           u.sale_invoice_id, u.batch_id, u.product_id, u.quantity,
           b.mrp, u.sale_rate, u.gst_rate, u.discount_pct,
           ROUND((u.quantity::numeric * u.sale_rate::numeric * (1 - u.discount_pct::numeric / 100)), 2) as line_total,
           ROUND(((u.quantity::numeric * u.sale_rate::numeric * (1 - u.discount_pct::numeric / 100)) * (u.gst_rate::numeric / 100)), 2) as tax_amount
         FROM unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::int[], $5::numeric[], $6::numeric[], $7::numeric[])
           AS u(sale_invoice_id, batch_id, product_id, quantity, sale_rate, gst_rate, discount_pct)
         JOIN batches b ON b.batch_id = u.batch_id
      `, itemValues);
  
      // 6. Update snapshot aggregations on parent invoice.
      //    subtotal     = SUM(line_total)  i.e. post-discount, pre-tax
      //    discount_amt = SUM(qty*rate) − subtotal  (gross − net-before-tax)
      //    tax_amount   = SUM(item.tax_amount)
      //    net_receivable = subtotal + tax_amount  (what the customer owes)
      //    amount_paid  = 0 for credit sale, net_receivable for cash sale
      await client.query(`
        UPDATE sale_invoices
        SET
          subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM sale_invoice_items WHERE sale_invoice_id = $1
          ),
          discount_amount = (
            SELECT COALESCE(SUM(quantity * sale_rate), 0) - COALESCE(SUM(line_total), 0)
            FROM sale_invoice_items WHERE sale_invoice_id = $1
          ),
          tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM sale_invoice_items WHERE sale_invoice_id = $1
          ),
          net_receivable = (
            SELECT COALESCE(SUM(line_total + tax_amount), 0)
            FROM sale_invoice_items WHERE sale_invoice_id = $1
          ),
          amount_paid = CASE
            WHEN $2::boolean THEN 0
            ELSE (SELECT COALESCE(SUM(line_total + tax_amount), 0) FROM sale_invoice_items WHERE sale_invoice_id = $1)
          END,
          created_by   = $3::uuid,
          status       = 'confirmed',
          confirmed_by = $3::uuid,
          confirmed_at = now()
        WHERE sale_invoice_id = $1
      `, [saleInvoiceId, data.isCredit, data.userId]);
  
      // 7. Insert into immutable ledger (stock_movements). The DB trigger handles updating batches.quantity_available.
      const movementValues = [
        allocationPlan.map(item => item.batch_id),
        allocationPlan.map(() => 'sale'), // Notice movement_type 'sale' reduces stock in trigger logic
        allocationPlan.map(item => item.quantity),
        allocationPlan.map(() => 'sale_invoice'),
        allocationPlan.map(() => saleInvoiceId),
        allocationPlan.map(() => 'FEFO Automated Sale')
      ];
  
      await client.query(`
        INSERT INTO stock_movements
           (batch_id, movement_type, quantity, reference_type, reference_id, notes)
         SELECT * FROM unnest($1::uuid[], $2::movement_type[], $3::int[], $4::text[], $5::uuid[], $6::text[])
      `, movementValues);
  
      await client.query('COMMIT');
      return { success: true, saleId: saleInvoiceId, invoiceNumber };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ add-sale error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  });

  ipcMain.handle("get-sales", async () => {
    try {
      return await queryDb(`
        SELECT
          s.sale_invoice_id,
          s.invoice_number,
          s.invoice_date,
          s.status,
          s.net_receivable,
          s.amount_paid,
          s.balance_due,
          s.created_at,
          c.customer_id,
          c.name AS customer_name
        FROM sale_invoices s
        JOIN customers c ON c.customer_id = s.customer_id
        ORDER BY s.created_at DESC
      `);
    } catch (err) {
      console.error("❌ get-sales error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-sale-details", async (event, saleInvoiceId) => {
    try {
      const headerRows = await queryDb(`
        SELECT
          s.sale_invoice_id,
          s.invoice_number,
          s.invoice_date,
          s.status,
          s.subtotal,
          s.discount_amount,
          s.tax_amount,
          s.net_receivable,
          s.amount_paid,
          s.balance_due,
          s.created_at,
          c.customer_id,
          c.name AS customer_name
        FROM sale_invoices s
        JOIN customers c ON c.customer_id = s.customer_id
        WHERE s.sale_invoice_id = $1
      `, [saleInvoiceId]);
  
      if (!headerRows.length) {
        return { success: false, error: "Sale invoice not found." };
      }
  
      const itemRows = await queryDb(`
        SELECT
          si.item_id,
          si.product_id,
          p.name AS product_name,
          si.batch_id,
          b.batch_number,
          si.quantity,
          si.sale_rate,
          si.gst_rate,
          si.discount_pct,
          si.line_total,
          si.tax_amount
        FROM sale_invoice_items si
        JOIN products p ON p.product_id = si.product_id
        JOIN batches b ON b.batch_id = si.batch_id
        WHERE si.sale_invoice_id = $1
        ORDER BY p.name ASC
      `, [saleInvoiceId]);
  
      return { success: true, header: headerRows[0], items: itemRows };
    } catch (err) {
      console.error("❌ get-sale-details error:", err.message);
      return { success: false, error: err.message };
    }
  });
}
