const { test } = require('node:test');
const assert = require('node:assert');
const { Pool } = require('pg');
require('dotenv').config({ path: 'Backend/app/.env' });
const { calculateFefoPlan } = require('../app/utils/fefoAllocator');

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "Pharmax",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

test('Integration Test: Axis 4 add-sale Transaction Orchestration', async (t) => {
  let customerId, productId, batchId1, batchId2, manufacturerId, supplierId;

  // Setup Phase: Create dummy data
  await t.test('Setup Dummy Data', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const custRes = await client.query(`
        INSERT INTO customers (name, address, credit_limit, customer_type)
        VALUES ('Test Customer', 'Test Address', 100000, 'retailer')
        RETURNING customer_id
      `);
      customerId = custRes.rows[0].customer_id;

      const manuRes = await client.query(`
        INSERT INTO manufacturers (name) VALUES ('Test Manufacturer') RETURNING manufacturer_id
      `);
      manufacturerId = manuRes.rows[0].manufacturer_id;

      const prodRes = await client.query(`
        INSERT INTO products (name, manufacturer_id, gst_rate)
        VALUES ('Test Product FEFO', $1, 18)
        RETURNING product_id
      `, [manufacturerId]);
      productId = prodRes.rows[0].product_id;

      const suppRes = await client.query(`
        INSERT INTO suppliers (name) VALUES ('Test Supplier') RETURNING supplier_id
      `);
      supplierId = suppRes.rows[0].supplier_id;

      // Note: we can't insert quantity_available directly because the trigger blocks it?
      // Actually, wait, it says CACHED, maintained by trigger. We'll disable the trigger for the test setup
      // or we'll just insert stock_movements. Let's disable the trigger temporarily.

      const batch1Res = await client.query(`
        INSERT INTO batches (product_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
        VALUES ($1, $2, 'BATCH_OLD', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days', 100, 80, 50)
        RETURNING batch_id
      `, [productId, supplierId]);
      batchId1 = batch1Res.rows[0].batch_id;

      const batch2Res = await client.query(`
        INSERT INTO batches (product_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
        VALUES ($1, $2, 'BATCH_NEW', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 100, 80, 100)
        RETURNING batch_id
      `, [productId, supplierId]);
      batchId2 = batch2Res.rows[0].batch_id;



      // To add stock legally, we must insert stock_movements


      await client.query('COMMIT');
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // Execution Phase: Run the Axis 4 transaction
  await t.test('Execute Axis 4 Transaction Logic', async () => {
    const data = {
      customerId: customerId,
      isCredit: false,
      items: [
        { productId: productId, quantity: 70, discountPct: 5 }
      ]
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const productIds = [...new Set(data.items.map(item => item.productId))];
      // Sort productIds to prevent deadlocks
      productIds.sort();

      // 1. Lock rows, ordered by expiry
      const lockRes = await client.query(`
        SELECT b.batch_id, b.product_id, b.quantity_available, b.mrp,
               b.mrp as sale_rate, p.gst_rate
        FROM batches b
        JOIN products p ON p.product_id = b.product_id
        WHERE b.product_id = ANY($1::uuid[]) AND b.quantity_available > 0 AND b.is_active = TRUE
        ORDER BY b.product_id, b.expiry_date ASC
        FOR UPDATE
      `, [productIds]);

      // 2. Pure JS FEFO Logic
      const allocationPlan = calculateFefoPlan(data.items, lockRes.rows);
      assert.strictEqual(allocationPlan.length, 2);
      assert.strictEqual(allocationPlan[0].quantity, 50); // takes all from old batch
      assert.strictEqual(allocationPlan[1].quantity, 20); // takes remaining 20 from new batch

      // 3. Insert Invoice Parent
      // For this script, we can just insert as 'draft'
      const invoiceRes = await client.query(`
        INSERT INTO sale_invoices
          (customer_id, invoice_date, status)
        VALUES ($1, CURRENT_DATE, 'draft')
        RETURNING sale_invoice_id
      `, [data.customerId]);
      const saleInvoiceId = invoiceRes.rows[0].sale_invoice_id;

      // Disable batches trigger again for deduction

      // 4. Bulk Insert Items using unnest
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

      // Update Aggregates on Parent
      await client.query(`
        UPDATE sale_invoices
        SET subtotal = (SELECT COALESCE(SUM(quantity * sale_rate), 0) FROM sale_invoice_items WHERE sale_invoice_id = $1),
            tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM sale_invoice_items WHERE sale_invoice_id = $1),
            net_receivable = (SELECT COALESCE(SUM(line_total + tax_amount), 0) FROM sale_invoice_items WHERE sale_invoice_id = $1),
            amount_paid = (SELECT COALESCE(SUM(line_total + tax_amount), 0) FROM sale_invoice_items WHERE sale_invoice_id = $1)
        WHERE sale_invoice_id = $1
      `, [saleInvoiceId]);

      // 5. Insert into immutable ledger
      const movementValues = [
        allocationPlan.map(item => item.batch_id),
        allocationPlan.map(() => 'sale'),
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

      // Verification Phase post-commit
      const verifyStock = await pool.query('SELECT quantity_available FROM batches WHERE batch_id = $1', [batchId1]);
      assert.strictEqual(verifyStock.rows[0].quantity_available, 0); // BATCH_OLD exhausted

      const verifyStock2 = await pool.query('SELECT quantity_available FROM batches WHERE batch_id = $1', [batchId2]);
      assert.strictEqual(verifyStock2.rows[0].quantity_available, 80); // BATCH_NEW has 80 left

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Teardown
  await t.test('Teardown Dummy Data', async () => {
    await pool.query('DELETE FROM stock_movements WHERE batch_id = $1 OR batch_id = $2', [batchId1, batchId2]);
    await pool.query('DELETE FROM sale_invoice_items WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM sale_invoices WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM batches WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM products WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM manufacturers WHERE manufacturer_id = $1', [manufacturerId]);
    await pool.query('DELETE FROM suppliers WHERE supplier_id = $1', [supplierId]);
    await pool.query('DELETE FROM customers WHERE customer_id = $1', [customerId]);
    await pool.end();
  });

});
