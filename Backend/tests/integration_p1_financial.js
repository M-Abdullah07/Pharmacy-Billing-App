const { test } = require('node:test');
const assert = require('node:assert');
const { Pool } = require('pg');
require('dotenv').config({ path: 'Backend/app/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "Pharmax",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// Minimal db façade matching Backend/app/services/db.js's queryDb/runDb/pool contract,
// wired to the same pool the rest of this test file uses.
async function queryDb(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}
async function runDb(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount,
    lastID: result.rows[0]?.id ?? result.rows[0]?.user_id
      ?? result.rows[0]?.product_id ?? result.rows[0]?.customer_id
      ?? result.rows[0]?.supplier_id ?? result.rows[0]?.batch_id ?? null,
    row: result.rows[0] ?? null,
  };
}
const db = { queryDb, runDb, pool };

// Minimal ipcMain mock: register() calls ipcMain.handle(channel, fn) — we just
// capture the handlers in a map so tests can invoke the REAL production handler
// function directly, exercising the actual saleService.js / ledgerService.js /
// purchaseService.js code (not a re-implementation), the same way Electron would.
//
// H3/H4: production handlers are now wrapped in requireAuth() (see
// Backend/app/services/session.js), which reads event.sender.id / checks
// event.senderFrame === event.sender.mainFrame. To exercise the REAL wrapped
// handlers (not a re-implementation) this mock simulates a single "logged in"
// webContents (id 1, mainFrame === itself) by default. Tests that need to
// exercise the unauthenticated path can pass `{ authenticated: false }`.
const MOCK_SENDER_ID = 1;
function makeMockEvent({ authenticated = true } = {}) {
  const mainFrame = { id: 'top-frame' };
  const sender = { id: MOCK_SENDER_ID, mainFrame };
  return {
    sender: authenticated ? sender : { id: MOCK_SENDER_ID + 999, mainFrame },
    senderFrame: mainFrame,
  };
}
function makeMockIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, ...args) => handlers.get(channel)(makeMockEvent(), ...args),
    invokeUnauthenticated: (channel, ...args) => handlers.get(channel)(makeMockEvent({ authenticated: false }), ...args),
  };
}

test('P1 Financial Correctness: credit limit, isCredit validation, payment FIFO, ledger fan-out', async (t) => {
  let customerId, customer2Id, productId, batchId, manufacturerId, supplierId, userId;
  let supplierPiId1, supplierPiId2;
  const stamp = Date.now();
  const testUsername = `test_p1_${stamp}`;

  const saleService = (await import('../app/services/saleService.js')).default;
  const ledgerService = (await import('../app/services/ledgerService.js')).default;
  const purchaseService = (await import('../app/services/purchaseService.js')).default;
  const { setSession, clearSession } = await import('../app/services/session.js');

  const saleIpc = makeMockIpcMain();
  saleService(saleIpc, db);
  const ledgerIpc = makeMockIpcMain();
  ledgerService(ledgerIpc, db);
  const purchaseIpc = makeMockIpcMain();
  purchaseService(purchaseIpc, db);

  await t.test('Setup dummy data', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const custRes = await client.query(`
        INSERT INTO customers (name, address, credit_limit, customer_type, opening_balance)
        VALUES ('Test P1 Customer', 'Addr', 1000, 'retailer', 0)
        RETURNING customer_id
      `);
      customerId = custRes.rows[0].customer_id;

      const cust2Res = await client.query(`
        INSERT INTO customers (name, address, credit_limit, customer_type, opening_balance)
        VALUES ('Test P1 Customer Unlimited', 'Addr', 0, 'retailer', 0)
        RETURNING customer_id
      `);
      customer2Id = cust2Res.rows[0].customer_id;

      const userRes = await client.query(`
        INSERT INTO users (username, password_hash, is_active)
        VALUES ($1, '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy', TRUE)
        RETURNING user_id
      `, [testUsername]);
      userId = userRes.rows[0].user_id;

      // H3: simulate a real login session for the mock webContents id so the
      // requireAuth()-wrapped handlers under test (add-sale, record-*-payment,
      // confirm-purchase-invoice, add-purchase-return, add-batch) see an
      // authenticated caller, exactly like the real login-user handler would
      // set up via setSession() on successful login.
      setSession(MOCK_SENDER_ID, { userId, username: testUsername });

      const manuRes = await client.query(`
        INSERT INTO manufacturers (name) VALUES ($1) RETURNING manufacturer_id
      `, [`Test P1 Manufacturer ${stamp}`]);
      manufacturerId = manuRes.rows[0].manufacturer_id;

      const prodRes = await client.query(`
        INSERT INTO products (name, manufacturer_id, gst_rate)
        VALUES ($1, $2, 0)
        RETURNING product_id
      `, [`Test P1 Product ${stamp}`, manufacturerId]);
      productId = prodRes.rows[0].product_id;

      const suppRes = await client.query(`
        INSERT INTO suppliers (name, opening_balance) VALUES ($1, 0) RETURNING supplier_id
      `, [`Test P1 Supplier ${stamp}`]);
      supplierId = suppRes.rows[0].supplier_id;

      // Batch priced high enough that a couple of units breach the 1000 credit_limit.
      const batchRes = await client.query(`
        INSERT INTO batches (product_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
        VALUES ($1, $2, 'P1_BATCH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '90 days', 800, 500, 100)
        RETURNING batch_id
      `, [productId, supplierId]);
      batchId = batchRes.rows[0].batch_id;

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // ── M7: isCredit must be a strict boolean ──────────────────────────────────
  await t.test('M7: add-sale rejects non-boolean isCredit', async () => {
    const res = await saleIpc.invoke('add-sale', {
      customerId, userId, isCredit: 'true', // string, not boolean
      items: [{ productId, quantity: 1 }],
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /isCredit must be a boolean/);
  });

  await t.test('M7: add-sale rejects missing isCredit', async () => {
    const res = await saleIpc.invoke('add-sale', {
      customerId, userId,
      items: [{ productId, quantity: 1 }],
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /isCredit must be a boolean/);
  });

  // ── M8: credit_limit enforcement ───────────────────────────────────────────
  await t.test('M8: add-sale blocks a credit sale that would exceed credit_limit', async () => {
    // 2 units * 800 = 1600 > credit_limit of 1000
    const res = await saleIpc.invoke('add-sale', {
      customerId, userId, isCredit: true,
      items: [{ productId, quantity: 2 }],
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Credit limit exceeded/);

    // Confirm no stock was deducted (transaction rolled back cleanly)
    const stock = await queryDb('SELECT quantity_available FROM batches WHERE batch_id = $1', [batchId]);
    assert.strictEqual(stock[0].quantity_available, 100);
  });

  await t.test('M8: add-sale allows a credit sale within credit_limit', async () => {
    // 1 unit * 800 = 800 <= 1000
    const res = await saleIpc.invoke('add-sale', {
      customerId, userId, isCredit: true,
      items: [{ productId, quantity: 1 }],
    });
    assert.strictEqual(res.success, true);

    const inv = await queryDb('SELECT amount_paid, net_receivable, balance_due FROM sale_invoices WHERE sale_invoice_id = $1', [res.saleId]);
    assert.strictEqual(Number(inv[0].amount_paid), 0);
    assert.ok(Number(inv[0].balance_due) > 0);
  });

  await t.test('M8: credit_limit = 0 (default) means unlimited, matching fn_check_credit_limit convention', async () => {
    // customer2Id has credit_limit = 0. A large credit sale should NOT be blocked by
    // the application-layer check (conservative choice documented in saleService.js
    // and in the P1 report — consistent with the existing DB trigger's own convention).
    const res = await saleIpc.invoke('add-sale', {
      customerId: customer2Id, userId, isCredit: true,
      items: [{ productId, quantity: 1 }],
    });
    assert.strictEqual(res.success, true);
  });

  // ── H2: customer-payment FIFO allocation + row locking ─────────────────────
  await t.test('H2: record-customer-payment allocates FIFO across oldest unpaid invoices first', async () => {
    // customerId now has one confirmed credit invoice with balance_due = 800 (net_receivable
    // for 1 unit @ 800, 0% GST). Pay 500 — should partially allocate to that invoice.
    const before = await queryDb(
      `SELECT sale_invoice_id, balance_due FROM sale_invoices WHERE customer_id = $1 AND status = 'confirmed' ORDER BY invoice_date ASC, created_at ASC`,
      [customerId]
    );
    assert.strictEqual(before.length, 1);
    const invoiceId = before[0].sale_invoice_id;
    const balanceBefore = Number(before[0].balance_due);
    assert.ok(balanceBefore > 0);

    const payRes = await ledgerIpc.invoke('record-customer-payment', {
      customerId, amount: 500, paymentMode: 'cash', referenceNo: 'TEST-PAY-1', notes: 'test', userId,
    });
    assert.strictEqual(payRes.success, true);

    const after = await queryDb(
      `SELECT balance_due, amount_paid FROM sale_invoices WHERE sale_invoice_id = $1`,
      [invoiceId]
    );
    assert.strictEqual(Number(after[0].amount_paid), 500);
    assert.strictEqual(Number(after[0].balance_due), balanceBefore - 500);
  });

  // ── M1: supplier-payment FIFO allocation ───────────────────────────────────
  await t.test('Setup: two confirmed purchase invoices for supplier FIFO test', async () => {
    const inv1 = await runDb(`
      INSERT INTO purchase_invoices
        (supplier_id, invoice_number, invoice_date, subtotal, tax_amount, net_payable, status, confirmed_at, confirmed_by)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '10 days', 1000, 0, 1000, 'confirmed', now(), $3)
      RETURNING purchase_invoice_id
    `, [supplierId, `P1-TEST-INV-1-${stamp}`, userId]);
    supplierPiId1 = inv1.row.purchase_invoice_id;

    const inv2 = await runDb(`
      INSERT INTO purchase_invoices
        (supplier_id, invoice_number, invoice_date, subtotal, tax_amount, net_payable, status, confirmed_at, confirmed_by)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '5 days', 2000, 0, 2000, 'confirmed', now(), $3)
      RETURNING purchase_invoice_id
    `, [supplierId, `P1-TEST-INV-2-${stamp}`, userId]);
    supplierPiId2 = inv2.row.purchase_invoice_id;
  });

  await t.test('M1: record-supplier-payment FIFO-allocates against purchase_invoices.amount_paid', async () => {
    // Pay 1500: should fully settle invoice 1 (1000) then partially allocate 500 to invoice 2.
    const payRes = await ledgerIpc.invoke('record-supplier-payment', {
      supplierId, amount: 1500, paymentMode: 'cash', referenceNo: 'TEST-SUP-PAY-1', notes: 'test', userId,
    });
    assert.strictEqual(payRes.success, true);

    const inv1After = await queryDb('SELECT amount_paid, balance_due FROM purchase_invoices WHERE purchase_invoice_id = $1', [supplierPiId1]);
    const inv2After = await queryDb('SELECT amount_paid, balance_due FROM purchase_invoices WHERE purchase_invoice_id = $1', [supplierPiId2]);

    assert.strictEqual(Number(inv1After[0].amount_paid), 1000);
    assert.strictEqual(Number(inv1After[0].balance_due), 0);
    assert.strictEqual(Number(inv2After[0].amount_paid), 500);
    assert.strictEqual(Number(inv2After[0].balance_due), 1500);
  });

  // ── H8: confirm-purchase-invoice no longer mutates suppliers.opening_balance ──
  await t.test('H8: confirming a purchase invoice does not mutate suppliers.opening_balance', async () => {
    const openingBefore = await queryDb('SELECT opening_balance FROM suppliers WHERE supplier_id = $1', [supplierId]);

    const draftInv = await runDb(`
      INSERT INTO purchase_invoices (supplier_id, invoice_number, invoice_date, status)
      VALUES ($1, $2, CURRENT_DATE, 'draft')
      RETURNING purchase_invoice_id
    `, [supplierId, `P1-TEST-DRAFT-${stamp}`]);
    const draftId = draftInv.row.purchase_invoice_id;

    await runDb(`
      INSERT INTO purchase_invoice_items
        (purchase_invoice_id, product_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity, line_total, tax_amount)
      VALUES ($1, $2, 'P1_CONFIRM_BATCH', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '365 days', 100, 60, 10, 600, 0)
    `, [draftId, productId]);

    const confirmRes = await purchaseIpc.invoke('confirm-purchase-invoice', draftId, userId);
    assert.strictEqual(confirmRes.success, true);

    const openingAfter = await queryDb('SELECT opening_balance FROM suppliers WHERE supplier_id = $1', [supplierId]);
    assert.strictEqual(Number(openingAfter[0].opening_balance), Number(openingBefore[0].opening_balance));

    // H9: header totals recomputed server-side from purchase_invoice_items, not left at 0.
    const confirmedHeader = await queryDb('SELECT subtotal, tax_amount, net_payable FROM purchase_invoices WHERE purchase_invoice_id = $1', [draftId]);
    assert.strictEqual(Number(confirmedHeader[0].subtotal), 600);
    assert.strictEqual(Number(confirmedHeader[0].net_payable), 600);
  });

  // ── C4/H7: v_customer_ar / v_supplier_ap no longer fan out ─────────────────
  await t.test('C4/H7: v_supplier_ap outstanding_payable is not multiplied by invoice x payment fan-out', async () => {
    // By this point the supplier has 3 confirmed invoices: 1000 + 2000 (FIFO test) +
    // 600 (H8 confirm-purchase-invoice test) = 3600 net_payable, and 1 payment of 1500.
    // Correct outstanding = 0 (opening_balance) + 3600 - 1500 = 2100. Before the C4/H7
    // fix this view's fan-out would have inflated this well past the correct value
    // (SUM(net_payable) multiplied by the payment row count, and vice versa).
    const ap = await queryDb('SELECT outstanding_payable FROM v_supplier_ap WHERE supplier_id = $1', [supplierId]);
    assert.strictEqual(Number(ap[0].outstanding_payable), 2100);
  });

  await t.test('C4/H7: v_customer_ar outstanding_balance is not multiplied by invoice x payment fan-out', async () => {
    // customerId has 1 confirmed invoice (net_receivable 800) and 1 payment (500).
    // Correct outstanding = 0 (opening_balance) + 800 - 500 = 300.
    const ar = await queryDb('SELECT outstanding_balance FROM v_customer_ar WHERE customer_id = $1', [customerId]);
    assert.strictEqual(Number(ar[0].outstanding_balance), 300);
  });

  // ── M30: opening balance seeding on the ledger handlers ────────────────────
  await t.test('M30: get-customer-ledger returns { openingBalance, entries } shape', async () => {
    const result = await ledgerIpc.invoke('get-customer-ledger', customerId, null, null);
    assert.ok('openingBalance' in result);
    assert.ok(Array.isArray(result.entries));
    assert.strictEqual(Number(result.openingBalance), 0); // opening_balance=0, no startDate filter given
  });

  await t.test('M30: get-customer-ledger seeds openingBalance from history before startDate', async () => {
    // Using a startDate far in the future should roll ALL current activity into
    // openingBalance and leave entries empty for the (impossible) window after it.
    const future = new Date();
    future.setFullYear(future.getFullYear() + 10);
    const futureDateStr = future.toISOString().split('T')[0];

    const result = await ledgerIpc.invoke('get-customer-ledger', customerId, futureDateStr, null);
    // 800 invoiced - 500 paid = 300 should be reflected as openingBalance since both predate futureDateStr
    assert.strictEqual(Number(result.openingBalance), 300);
    assert.strictEqual(result.entries.length, 0);
  });

  await t.test('M30: get-supplier-ledger returns { openingBalance, entries } shape', async () => {
    const result = await ledgerIpc.invoke('get-supplier-ledger', supplierId, null, null);
    assert.ok('openingBalance' in result);
    assert.ok(Array.isArray(result.entries));
  });

  // ── C4/H7/M18: get-analytics-chart-data no longer fans out sales x purchases ──
  // systemService.js imports 'electron' (dialog/app) at module scope, so it cannot be
  // loaded directly under node:test outside Electron. This subtest runs the exact SQL
  // text from the fixed get-analytics-chart-data handler (Backend/app/services/systemService.js)
  // in complete isolation (its own transaction, rolled back at the end) so the expected
  // sums are exact rather than inequality bounds contaminated by other tests' data.
  await t.test('C4/H7/M18: get-analytics-chart-data query does not fan out sales x purchases', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cust = await client.query(`INSERT INTO customers (name) VALUES ($1) RETURNING customer_id`, [`Analytics Test Customer ${stamp}`]);
      const acustomerId = cust.rows[0].customer_id;
      const supp = await client.query(`INSERT INTO suppliers (name) VALUES ($1) RETURNING supplier_id`, [`Analytics Test Supplier ${stamp}`]);
      const asupplierId = supp.rows[0].supplier_id;

      // 3 confirmed sale invoices this month, 100 each = 300 total.
      for (let i = 0; i < 3; i++) {
        await client.query(`
          INSERT INTO sale_invoices (customer_id, invoice_date, status, net_receivable, confirmed_at, confirmed_by)
          VALUES ($1, CURRENT_DATE, 'confirmed', 100, now(), $2)
        `, [acustomerId, userId]);
      }
      // 2 confirmed purchase invoices this month, 500 each = 1000 total.
      for (let i = 0; i < 2; i++) {
        await client.query(`
          INSERT INTO purchase_invoices (supplier_id, invoice_number, invoice_date, status, net_payable, confirmed_at, confirmed_by)
          VALUES ($1, $2, CURRENT_DATE, 'confirmed', 500, now(), $3)
        `, [asupplierId, `ANALYTICS-TEST-${stamp}-${i}`, userId]);
      }

      const rows = await client.query(`
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                date_trunc('month', CURRENT_DATE),
                '1 month'
            ) AS month
        ),
        monthly_sales AS (
            SELECT date_trunc('month', invoice_date) AS month, SUM(net_receivable) AS total
            FROM sale_invoices
            WHERE status = 'confirmed' AND customer_id = $1
            GROUP BY date_trunc('month', invoice_date)
        ),
        monthly_purchases AS (
            SELECT date_trunc('month', invoice_date) AS month, SUM(net_payable) AS total
            FROM purchase_invoices
            WHERE status = 'confirmed' AND supplier_id = $2
            GROUP BY date_trunc('month', invoice_date)
        )
        SELECT
            to_char(m.month, 'FMMonth') AS month,
            COALESCE(ms.total, 0) AS sales,
            COALESCE(mp.total, 0) AS purchases
        FROM months m
        LEFT JOIN monthly_sales ms ON ms.month = m.month
        LEFT JOIN monthly_purchases mp ON mp.month = m.month
        ORDER BY m.month
      `, [acustomerId, asupplierId]);

      const thisMonth = rows.rows[rows.rows.length - 1];
      // With the pre-aggregation fix: exactly 300 sales, exactly 1000 purchases.
      // The old fan-out query would have produced sales=300*2=600 (multiplied by the
      // 2 purchase rows) and purchases=1000*3=3000 (multiplied by the 3 sale rows).
      assert.strictEqual(Number(thisMonth.sales), 300);
      assert.strictEqual(Number(thisMonth.purchases), 1000);

      await client.query('ROLLBACK');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // ── Teardown ────────────────────────────────────────────────────────────────
  await t.test('Teardown', async () => {
    await pool.query('DELETE FROM payments WHERE party_id IN ($1, $2)', [customerId, supplierId]);
    await pool.query('DELETE FROM sale_invoice_items WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM sale_invoices WHERE customer_id IN ($1, $2)', [customerId, customer2Id]);
    await pool.query('DELETE FROM purchase_invoice_items WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM purchase_invoices WHERE supplier_id = $1', [supplierId]);
    // The H8 test's confirm-purchase-invoice call creates a second batch (new
    // batch_number path) via the same product_id, so clear stock_movements for ALL
    // batches of this test product, not just the originally-seeded batchId.
    await pool.query('DELETE FROM stock_movements WHERE batch_id IN (SELECT batch_id FROM batches WHERE product_id = $1)', [productId]);
    await pool.query('DELETE FROM batches WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM products WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM manufacturers WHERE manufacturer_id = $1', [manufacturerId]);
    await pool.query('DELETE FROM suppliers WHERE supplier_id = $1', [supplierId]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM customers WHERE customer_id IN ($1, $2)', [customerId, customer2Id]);
    clearSession(MOCK_SENDER_ID);
    await pool.end();
  });
});

// ─── H3/H4/H18: session state + requireAuth gating + signup bootstrap rules ──
test('Session/auth gating: requireAuth wrapper, server-side userId precedence, signup-user bootstrap rule', async (t) => {
  const pool2 = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "Pharmax",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  });
  async function queryDb2(sql, params = []) {
    const result = await pool2.query(sql, params);
    return result.rows;
  }
  async function runDb2(sql, params = []) {
    const result = await pool2.query(sql, params);
    return {
      rowCount: result.rowCount,
      lastID: result.rows[0]?.id ?? result.rows[0]?.user_id
        ?? result.rows[0]?.product_id ?? result.rows[0]?.customer_id
        ?? result.rows[0]?.supplier_id ?? result.rows[0]?.batch_id ?? null,
      row: result.rows[0] ?? null,
    };
  }
  const db2 = { queryDb: queryDb2, runDb: runDb2, pool: pool2 };

  const { setSession: setSession2, getSession: getSession2, clearSession: clearSession2, requireAuth } =
    await import('../app/services/session.js');
  const stockService = (await import('../app/services/stockService.js')).default;

  const SENDER_A = 5001; // will be "logged in"
  const SENDER_B = 5002; // will remain "logged out"
  let userId, productId, supplierId, manufacturerId;
  const stamp = Date.now();

  await t.test('Setup dummy data', async () => {
    const client = await pool2.connect();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(`
        INSERT INTO users (username, password_hash, is_active)
        VALUES ($1, '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy', TRUE)
        RETURNING user_id
      `, [`test_session_${stamp}`]);
      userId = userRes.rows[0].user_id;

      const manuRes = await client.query(`
        INSERT INTO manufacturers (name) VALUES ($1) RETURNING manufacturer_id
      `, [`Test Session Manufacturer ${stamp}`]);
      manufacturerId = manuRes.rows[0].manufacturer_id;

      const prodRes = await client.query(`
        INSERT INTO products (name, manufacturer_id, gst_rate)
        VALUES ($1, $2, 0)
        RETURNING product_id
      `, [`Test Session Product ${stamp}`, manufacturerId]);
      productId = prodRes.rows[0].product_id;

      const suppRes = await client.query(`
        INSERT INTO suppliers (name) VALUES ($1) RETURNING supplier_id
      `, [`Test Session Supplier ${stamp}`]);
      supplierId = suppRes.rows[0].supplier_id;

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // ── session.js primitives ──────────────────────────────────────────────────
  await t.test('setSession/getSession/clearSession round-trip', () => {
    assert.strictEqual(getSession2(SENDER_A), null);
    setSession2(SENDER_A, { userId, username: 'someone' });
    assert.deepStrictEqual(getSession2(SENDER_A), { userId, username: 'someone' });
    clearSession2(SENDER_A);
    assert.strictEqual(getSession2(SENDER_A), null);
  });

  // ── requireAuth: unauthenticated caller is rejected ────────────────────────
  await t.test('requireAuth rejects a call from a webContents with no session (object-shaped error)', async () => {
    const stockIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    stockService(stockIpc, db2);
    const addBatch = stockIpc.handlers.get('add-batch');

    const event = { sender: { id: SENDER_B, mainFrame: {} }, senderFrame: {} };
    event.sender.mainFrame = event.senderFrame; // top frame == mainFrame, but no session set for SENDER_B
    const res = await addBatch(event, {
      product_id: productId, supplier_id: supplierId, batch_number: `NOAUTH-${stamp}`,
      manufacturing_date: '2024-01-01', expiry_date: '2030-01-01', mrp: 10, purchase_cost_per_unit: 5, quantity_received: 1,
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Not authenticated/);
  });

  // ── requireAuth: authenticated caller (session set) is allowed through ────
  await t.test('requireAuth allows a call once setSession has been called for that webContents id', async () => {
    const stockIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    stockService(stockIpc, db2);
    const addBatch = stockIpc.handlers.get('add-batch');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };

    const res = await addBatch(event, {
      product_id: productId, supplier_id: supplierId, batch_number: `AUTH-${stamp}`,
      manufacturing_date: '2024-01-01', expiry_date: '2030-01-01', mrp: 10, purchase_cost_per_unit: 5, quantity_received: 1,
    });
    assert.strictEqual(res.success, true);
    clearSession2(SENDER_A);
  });

  // ── requireAuth: a call whose senderFrame is NOT the top frame is rejected ─
  await t.test('requireAuth rejects a call whose senderFrame is not event.sender.mainFrame (non-top-frame IPC)', async () => {
    const stockIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    stockService(stockIpc, db2);
    const addBatch = stockIpc.handlers.get('add-batch');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const childFrame = {}; // a different frame object than mainFrame
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: childFrame };

    const res = await addBatch(event, {
      product_id: productId, supplier_id: supplierId, batch_number: `CHILDFRAME-${stamp}`,
      manufacturing_date: '2024-01-01', expiry_date: '2030-01-01', mrp: 10, purchase_cost_per_unit: 5, quantity_received: 1,
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Not authenticated/);
    clearSession2(SENDER_A);
  });

  // ── requireAuth: unauthorizedValue override for list-style handlers ────────
  await t.test('requireAuth honors a custom unauthorizedValue (e.g. [] for list handlers)', async () => {
    const handler = requireAuth(async () => ['should-not-reach-here'], { unauthorizedValue: [] });
    const event = { sender: { id: SENDER_B, mainFrame: {} }, senderFrame: undefined };
    event.senderFrame = event.sender.mainFrame;
    const res = await handler(event);
    assert.deepStrictEqual(res, []);
  });

  // ── H3: server-side session userId wins over frontend-supplied data.userId ─
  await t.test('add-batch runs successfully using the session-verified caller (server userId is authoritative)', async () => {
    // add-batch itself does not record created_by, but this exercises the same
    // requireAuth() plumbing that add-sale/record-*-payment/confirm-purchase-invoice
    // use to prefer event.locals.session.userId over any client-supplied id — the
    // full server-userId-wins behavior is exercised end-to-end for add-sale in the
    // "H3: server session userId" test below.
    const stockIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    stockService(stockIpc, db2);
    const addBatch = stockIpc.handlers.get('add-batch');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };
    const res = await addBatch(event, {
      product_id: productId, supplier_id: supplierId, batch_number: `SESSIONWINS-${stamp}`,
      manufacturing_date: '2024-01-01', expiry_date: '2030-01-01', mrp: 10, purchase_cost_per_unit: 5, quantity_received: 1,
    });
    assert.strictEqual(res.success, true);
    clearSession2(SENDER_A);
  });

  await t.test('H3: add-sale prefers the server-side session userId over a spoofed data.userId', async () => {
    const saleService = (await import('../app/services/saleService.js')).default;
    const saleIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    saleService(saleIpc, db2);
    const addSale = saleIpc.handlers.get('add-sale');

    const custRes = await pool2.query(`
      INSERT INTO customers (name, address, credit_limit, customer_type, opening_balance)
      VALUES ('Test Session Customer', 'Addr', 0, 'retailer', 0)
      RETURNING customer_id
    `);
    const sessionCustomerId = custRes.rows[0].customer_id;

    const batchRes = await pool2.query(`
      INSERT INTO batches (product_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
      VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '90 days', 50, 30, 20)
      RETURNING batch_id
    `, [productId, supplierId, `SESSION_SALE_BATCH-${stamp}`]);
    const sessionBatchId = batchRes.rows[0].batch_id;

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };

    // Spoof a bogus, non-existent userId in the payload — the server session's
    // real userId must win, or this insert would violate the users FK.
    const spoofedUserId = '00000000-0000-0000-0000-000000000000';
    const res = await addSale(event, {
      customerId: sessionCustomerId, userId: spoofedUserId, isCredit: false,
      items: [{ productId, quantity: 1 }],
    });
    assert.strictEqual(res.success, true);

    const inv = await queryDb2('SELECT confirmed_by, created_by FROM sale_invoices WHERE sale_invoice_id = $1', [res.saleId]);
    assert.strictEqual(inv[0].confirmed_by, userId);
    assert.strictEqual(inv[0].created_by, userId);
    assert.notStrictEqual(inv[0].confirmed_by, spoofedUserId);

    clearSession2(SENDER_A);

    // Cleanup this sub-test's fixtures.
    await pool2.query('DELETE FROM stock_movements WHERE batch_id = $1', [sessionBatchId]);
    await pool2.query('DELETE FROM sale_invoice_items WHERE sale_invoice_id = $1', [res.saleId]);
    await pool2.query('DELETE FROM sale_invoices WHERE sale_invoice_id = $1', [res.saleId]);
    await pool2.query('DELETE FROM batches WHERE batch_id = $1', [sessionBatchId]);
    await pool2.query('DELETE FROM customers WHERE customer_id = $1', [sessionCustomerId]);
  });

  // ── H18: signup-user bootstrap rule ────────────────────────────────────────
  await t.test('H18: signup-user rejects a new account when users table is non-empty and caller has no session', async () => {
    const authService = (await import('../app/services/authService.js')).default;
    const authIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    authService(authIpc, db2);
    const signupUser = authIpc.handlers.get('signup-user');

    // users table is non-empty (at minimum, the userId fixture above exists),
    // and SENDER_B has no session.
    const mainFrame = {};
    const event = { sender: { id: SENDER_B, mainFrame }, senderFrame: mainFrame };
    const res = await signupUser(event, `should_not_be_created_${stamp}`, 'longenoughpassword');
    assert.strictEqual(res.success, false);
    assert.match(res.error, /logged in/i);

    const check = await queryDb2('SELECT user_id FROM users WHERE username = $1', [`should_not_be_created_${stamp}`]);
    assert.strictEqual(check.length, 0);
  });

  await t.test('H18: signup-user allows a new account when the caller has an authenticated session', async () => {
    const authService = (await import('../app/services/authService.js')).default;
    const authIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    authService(authIpc, db2);
    const signupUser = authIpc.handlers.get('signup-user');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };
    const newUsername = `colleague_${stamp}`;
    const res = await signupUser(event, newUsername, 'longenoughpassword');
    assert.strictEqual(res.success, true);

    await pool2.query('DELETE FROM users WHERE username = $1', [newUsername]);
    clearSession2(SENDER_A);
  });

  await t.test('H18: backend password policy rejects passwords under 8 characters even with a valid session', async () => {
    const authService = (await import('../app/services/authService.js')).default;
    const authIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    authService(authIpc, db2);
    const signupUser = authIpc.handlers.get('signup-user');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };
    const res = await signupUser(event, `shortpw_${stamp}`, 'short1');
    assert.strictEqual(res.success, false);
    assert.match(res.error, /at least 8 characters/);
    clearSession2(SENDER_A);
  });

  // ── H4: assertShape validator, exercised directly ──────────────────────────
  await t.test('H4: assertShape rejects negative/non-finite amounts and quantities', async () => {
    const { assertShape } = await import('../app/utils/validate.js');
    assert.throws(() => assertShape({ amount: -5 }, { amount: 'number>=0' }), /must not be negative/);
    assert.throws(() => assertShape({ amount: Infinity }, { amount: 'number>=0' }), /must be a finite number/);
    assert.throws(() => assertShape({ amount: NaN }, { amount: 'number>=0' }), /must be a finite number/);
    assert.throws(() => assertShape({}, { name: 'string' }), /is required/);
    assert.doesNotThrow(() => assertShape({ amount: 0 }, { amount: 'number>=0' }));
    assert.doesNotThrow(() => assertShape({}, { amount: 'number>=0?' }));
  });

  await t.test('H4: add-batch rejects a negative quantity_received via assertShape', async () => {
    const stockIpc = { handlers: new Map(), handle(ch, fn) { this.handlers.set(ch, fn); } };
    stockService(stockIpc, db2);
    const addBatch = stockIpc.handlers.get('add-batch');

    setSession2(SENDER_A, { userId, username: 'someone' });
    const mainFrame = {};
    const event = { sender: { id: SENDER_A, mainFrame }, senderFrame: mainFrame };
    const res = await addBatch(event, {
      product_id: productId, supplier_id: supplierId, batch_number: `NEGQTY-${stamp}`,
      manufacturing_date: '2024-01-01', expiry_date: '2030-01-01', mrp: 10, purchase_cost_per_unit: 5, quantity_received: -3,
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /must not be negative/);
    clearSession2(SENDER_A);
  });

  // ── Teardown ────────────────────────────────────────────────────────────────
  await t.test('Teardown', async () => {
    await pool2.query('DELETE FROM stock_movements WHERE batch_id IN (SELECT batch_id FROM batches WHERE product_id = $1)', [productId]);
    await pool2.query('DELETE FROM batches WHERE product_id = $1', [productId]);
    await pool2.query('DELETE FROM products WHERE product_id = $1', [productId]);
    await pool2.query('DELETE FROM manufacturers WHERE manufacturer_id = $1', [manufacturerId]);
    await pool2.query('DELETE FROM suppliers WHERE supplier_id = $1', [supplierId]);
    await pool2.query('DELETE FROM users WHERE user_id = $1', [userId]);
    clearSession2(SENDER_A);
    clearSession2(SENDER_B);
    await pool2.end();
  });
});
