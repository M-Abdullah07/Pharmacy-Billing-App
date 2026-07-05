import { requireAuth } from "./session.js";
import { assertShape } from "../utils/validate.js";

export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  // H17/M28: shared server-side totals recompute, used by both the legacy
  // confirm-purchase-invoice path and the new single-call create-purchase-invoice
  // handler so both derive the header snapshot the same way, from
  // purchase_invoice_items (the authoritative source), never from client input.
  async function recomputeInvoiceTotals(client, purchaseInvoiceId) {
    const totalsRes = await client.query(
      `SELECT
         COALESCE(SUM(line_total), 0) AS subtotal,
         COALESCE(SUM(purchase_cost_per_unit * quantity), 0) - COALESCE(SUM(line_total), 0) AS discount_amount,
         COALESCE(SUM(tax_amount), 0) AS tax_amount,
         COALESCE(SUM(line_total + tax_amount), 0) AS net_payable
       FROM purchase_invoice_items
       WHERE purchase_invoice_id = $1`,
      [purchaseInvoiceId]
    );
    return totalsRes.rows[0];
  }

  // H17/M28: shared per-item stock/batch application, used by both the legacy
  // confirm-purchase-invoice path and create-purchase-invoice.
  async function applyItemsToStock(client, items, supplierId, purchaseInvoiceId) {
    for (const item of items) {
      const existingBatch = await client.query(
        `SELECT batch_id, quantity_available FROM batches
         WHERE product_id = $1 AND batch_number = $2`,
        [item.product_id, item.batch_number]
      );

      if (existingBatch.rows.length > 0) {
        const batchId = existingBatch.rows[0].batch_id;
        await client.query(
          `INSERT INTO stock_movements
             (batch_id, movement_type, quantity, reference_type, reference_id, notes)
           VALUES ($1, 'purchase', $2, 'purchase_invoice', $3, 'GRN confirmation')`,
          [batchId, item.quantity, purchaseInvoiceId]
        );
      } else {
        // New batch — INSERT triggers auto stock_movement via trg_batch_insert_opening_movement
        await client.query(
          `INSERT INTO batches
             (product_id, supplier_id, purchase_invoice_id, batch_number,
              manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            item.product_id,
            supplierId,
            purchaseInvoiceId,
            item.batch_number,
            item.manufacturing_date,
            item.expiry_date,
            item.mrp,
            item.purchase_cost_per_unit,
            item.quantity,
          ]
        );
      }
    }
  }

  ipcMain.handle("get-purchase-invoices", async () => {
    try {
      return await queryDb(
        `SELECT pi.purchase_invoice_id, pi.invoice_number, pi.invoice_date,
                pi.received_date, pi.status, pi.subtotal, pi.discount_amount,
                pi.tax_amount, pi.net_payable, pi.notes, pi.created_at,
                s.name AS supplier_name
         FROM purchase_invoices pi
         JOIN suppliers s ON s.supplier_id = pi.supplier_id
         ORDER BY pi.created_at DESC`
      );
    } catch (err) {
      console.error("❌ get-purchase-invoices error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-purchase-invoice", async (event, id) => {
    try {
      const [header, items] = await Promise.all([
        queryDb(
          `SELECT pi.*, s.name AS supplier_name
           FROM purchase_invoices pi
           JOIN suppliers s ON s.supplier_id = pi.supplier_id
           WHERE pi.purchase_invoice_id = $1`,
          [id]
        ),
        queryDb(
          `SELECT pii.*, p.name AS product_name, p.uom
           FROM purchase_invoice_items pii
           JOIN products p ON p.product_id = pii.product_id
           WHERE pii.purchase_invoice_id = $1
           ORDER BY pii.item_id`,
          [id]
        ),
      ]);
      return { header: header[0] || null, items };
    } catch (err) {
      console.error("❌ get-purchase-invoice error:", err.message);
      return { header: null, items: [] };
    }
  });

  ipcMain.handle("add-purchase-invoice", requireAuth(async (event, data) => {
    try {
      assertShape(data, {
        supplier_id: "string",
        invoice_number: "string",
        subtotal: "number>=0?",
        discount_amount: "number>=0?",
        tax_amount: "number>=0?",
        net_payable: "number>=0?",
      });
      const result = await runDb(
        `INSERT INTO purchase_invoices
           (supplier_id, invoice_number, invoice_date, received_date,
            subtotal, discount_amount, tax_amount, net_payable, notes, status, confirmed_at, confirmed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft', NULL, NULL)
         RETURNING purchase_invoice_id`,
        [
          data.supplier_id,
          data.invoice_number,
          data.invoice_date,
          data.received_date || data.invoice_date,
          data.subtotal ?? 0,
          data.discount_amount ?? 0,
          data.tax_amount ?? 0,
          data.net_payable ?? 0,
          data.notes || null,
        ]
      );
      return { success: true, purchaseInvoiceId: result.row.purchase_invoice_id };
    } catch (err) {
      if (err.code === "23505")
        return { success: false, error: "A GRN with this supplier invoice number already exists. Please verify before saving." };
      console.error("❌ add-purchase-invoice error:", err.message);
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle("add-purchase-invoice-item", requireAuth(async (event, data) => {
    try {
      assertShape(data, {
        purchase_invoice_id: "string",
        product_id: "string",
        batch_number: "string",
        mrp: "number>=0",
        purchase_cost_per_unit: "number>=0",
        quantity: "number>=0",
        line_total: "number>=0",
      });
      const result = await runDb(
        `INSERT INTO purchase_invoice_items
           (purchase_invoice_id, product_id, batch_number, manufacturing_date,
            expiry_date, mrp, purchase_cost_per_unit, quantity,
            discount_pct, gst_rate, line_total, tax_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING item_id`,
        [
          data.purchase_invoice_id,
          data.product_id,
          data.batch_number,
          data.manufacturing_date,
          data.expiry_date,
          data.mrp,
          data.purchase_cost_per_unit,
          data.quantity,
          data.discount_pct ?? 0,
          data.gst_rate ?? 0,
          data.line_total,
          data.tax_amount ?? 0,
        ]
      );
      return { success: true, itemId: result.row.item_id };
    } catch (err) {
      console.error("❌ add-purchase-invoice-item error:", err.message);
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle("confirm-purchase-invoice", requireAuth(async (event, id, userIdArg) => {
    // H3: server-side session userId wins over the frontend-supplied one.
    const userId = event.locals?.session?.userId ?? userIdArg;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch invoice header
      const headerRes = await client.query(
        `SELECT * FROM purchase_invoices WHERE purchase_invoice_id = $1 FOR UPDATE`,
        [id]
      );
      const header = headerRes.rows[0];
      if (!header) throw new Error("Purchase invoice not found.");
      if (header.status !== "draft") throw new Error("Only draft invoices can be confirmed.");

      // Fetch all line items
      const itemsRes = await client.query(
        `SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1`,
        [id]
      );
      const items = itemsRes.rows;
      if (items.length === 0) throw new Error("Cannot confirm a purchase invoice with no line items.");

      // H9/H17/M28: Recompute header totals server-side from purchase_invoice_items
      // instead of trusting whatever subtotal/discount/tax/net_payable the frontend
      // originally sent to add-purchase-invoice. Line items are the authoritative
      // source (schema comment on purchase_invoice_items.line_total); the header is
      // a denormalised snapshot that must be derived, not client-supplied, at the
      // moment it becomes immutable. Shared with create-purchase-invoice below.
      const totals = await recomputeInvoiceTotals(client, id);

      await applyItemsToStock(client, items, header.supplier_id, id);

      // H8: opening_balance is immutable historical fact captured at onboarding — it must
      // NEVER be mutated by transactional activity. v_supplier_ap already derives the
      // supplier's outstanding payable as opening_balance + SUM(confirmed net_payable) -
      // SUM(payments); incrementing opening_balance here would double-count this invoice
      // in that view. (Previously this handler incremented suppliers.opening_balance —
      // removed.)

      // Confirm the invoice, writing back the server-recomputed totals (H9).
      await client.query(
        `UPDATE purchase_invoices
        SET status = 'confirmed',
            subtotal = $3,
            discount_amount = $4,
            tax_amount = $5,
            net_payable = $6,
            confirmed_at = now(),
            confirmed_by = $2,
            updated_at = now()
        WHERE purchase_invoice_id = $1`,
        [id, userId, totals.subtotal, totals.discount_amount, totals.tax_amount, totals.net_payable]
      );
  
      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ confirm-purchase-invoice error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }));

  // H17/M28: single transactional handler that creates the purchase invoice
  // header AND its line items in one BEGIN/COMMIT — instead of the legacy
  // multi-call dance (add-purchase-invoice -> N x add-purchase-invoice-item),
  // which left a window where a header could exist with zero/partial items if
  // the renderer crashed or the user navigated away mid-sequence. Totals are
  // computed server-side via the same recomputeInvoiceTotals() helper
  // confirm-purchase-invoice uses (H9), never trusted from the frontend.
  //
  // Conservative choice: this handler saves as 'draft', same as the existing
  // "Save as Draft" UX — it does NOT auto-confirm. Confirming (which mutates
  // stock and the supplier ledger) remains a separate, explicit
  // confirm-purchase-invoice call so the existing review-before-confirm
  // workflow is unchanged. Only the header+items creation step becomes atomic.
  //
  // The legacy add-purchase-invoice / add-purchase-invoice-item handlers above
  // are KEPT registered for backward compatibility; this is purely an
  // additive, safer alternative that the UI now calls.
  ipcMain.handle("create-purchase-invoice", requireAuth(async (event, data) => {
    const client = await pool.connect();
    try {
      assertShape(data, {
        supplier_id: "string",
        invoice_number: "string",
      });
      assertShape(data, { items: "array" });
      if (data.items.length === 0) {
        throw new Error("Cannot create a purchase invoice with no line items.");
      }
      for (const item of data.items) {
        assertShape(item, {
          product_id: "string",
          batch_number: "string",
          mrp: "number>=0",
          purchase_cost_per_unit: "number>=0",
          quantity: "number>=0",
          line_total: "number>=0",
        });
      }

      await client.query("BEGIN");

      const headerResult = await client.query(
        `INSERT INTO purchase_invoices
           (supplier_id, invoice_number, invoice_date, received_date,
            subtotal, discount_amount, tax_amount, net_payable, notes, status, confirmed_at, confirmed_by)
         VALUES ($1,$2,$3,$4,0,0,0,0,$5,'draft', NULL, NULL)
         RETURNING purchase_invoice_id`,
        [
          data.supplier_id,
          data.invoice_number,
          data.invoice_date || new Date().toISOString().split("T")[0],
          data.received_date || data.invoice_date || new Date().toISOString().split("T")[0],
          data.notes || null,
        ]
      );
      const purchaseInvoiceId = headerResult.rows[0].purchase_invoice_id;

      for (const item of data.items) {
        await client.query(
          `INSERT INTO purchase_invoice_items
             (purchase_invoice_id, product_id, batch_number, manufacturing_date,
              expiry_date, mrp, purchase_cost_per_unit, quantity,
              discount_pct, gst_rate, line_total, tax_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            purchaseInvoiceId,
            item.product_id,
            item.batch_number,
            item.manufacturing_date,
            item.expiry_date,
            item.mrp,
            item.purchase_cost_per_unit,
            item.quantity,
            item.discount_pct ?? 0,
            item.gst_rate ?? 0,
            item.line_total,
            item.tax_amount ?? 0,
          ]
        );
      }

      // Recompute totals from what we just inserted (H9's approach, reused)
      // and persist them on the still-draft header, same as confirm does —
      // so the draft list view shows accurate totals even before confirmation.
      const totals = await recomputeInvoiceTotals(client, purchaseInvoiceId);
      await client.query(
        `UPDATE purchase_invoices
         SET subtotal = $2, discount_amount = $3, tax_amount = $4, net_payable = $5, updated_at = now()
         WHERE purchase_invoice_id = $1`,
        [purchaseInvoiceId, totals.subtotal, totals.discount_amount, totals.tax_amount, totals.net_payable]
      );

      await client.query("COMMIT");
      return { success: true, purchaseInvoiceId };
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505")
        return { success: false, error: "A GRN with this supplier invoice number already exists. Please verify before saving." };
      console.error("❌ create-purchase-invoice error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }));

  ipcMain.handle("cancel-purchase-invoice", requireAuth(async (event, id) => {
    try {
      const rows = await queryDb(
        `SELECT status FROM purchase_invoices WHERE purchase_invoice_id = $1`, [id]
      );
      if (!rows.length) return { success: false, error: "Invoice not found." };
      if (rows[0].status === "confirmed")
        return { success: false, error: "Confirmed invoices cannot be cancelled." };

      await runDb(
        `UPDATE purchase_invoices
         SET status = 'cancelled', updated_at = now()
         WHERE purchase_invoice_id = $1`,
        [id]
      );
      return { success: true };
    } catch (err) {
      console.error("❌ cancel-purchase-invoice error:", err.message);
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle("get-purchase-return-items", async (event, invoiceId) => {
    try {
      return await queryDb(
        `SELECT b.batch_id,
                pii.product_id,
                pii.batch_number,
                pii.purchase_cost_per_unit,
                pii.quantity            AS invoiced_qty,
                b.quantity_available,
                COALESCE(pii.discount_pct, 0) AS discount_pct,
                COALESCE(pii.gst_rate,    0) AS gst_rate,
                p.name                  AS product_name
         FROM purchase_invoice_items pii
         JOIN products p ON p.product_id = pii.product_id
         JOIN batches  b ON b.product_id  = pii.product_id
                        AND b.batch_number = pii.batch_number
         WHERE pii.purchase_invoice_id = $1
           AND b.quantity_available > 0`,
        [invoiceId]
      );
    } catch (err) {
      console.error("❌ get-purchase-return-items error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-purchase-returns", async () => {
    try {
      return await queryDb(`
        SELECT pr.*, pi.invoice_number AS purchase_invoice_number, s.name AS supplier_name
        FROM purchase_returns pr
        JOIN purchase_invoices pi ON pi.purchase_invoice_id = pr.purchase_invoice_id
        JOIN suppliers s ON s.supplier_id = pr.supplier_id
        ORDER BY pr.created_at DESC
      `);
    } catch (err) {
      console.error("❌ get-purchase-returns error:", err.message);
      return [];
    }
  });

  ipcMain.handle("add-purchase-return", requireAuth(async (event, data) => {
    const client = await pool.connect();
    try {
      assertShape(data, {
        purchase_invoice_id: "string",
        supplier_id: "string",
        total_credit: "number>=0?",
      });

      // H3: server-side session userId wins over the frontend-supplied one.
      const effectiveUserId = event.locals?.session?.userId ?? data.user_id;

      await client.query("BEGIN");

      // 1. Create Purchase Return Header
      const returnResult = await client.query(
        `INSERT INTO purchase_returns
           (purchase_invoice_id, supplier_id, return_date, reason, notes, total_credit, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)
         RETURNING return_id`,
        [
          data.purchase_invoice_id,
          data.supplier_id,
          data.return_date || new Date().toISOString().split('T')[0],
          data.reason || 'other',
          data.notes || '',
          data.total_credit || 0,
          effectiveUserId || null
        ]
      );
      const returnId = returnResult.rows[0].return_id;
  
      // 2. Process Items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.quantity <= 0) {
            throw new Error("Quantity must be greater than zero for all returned items.");
          }
  
          // Insert return item
          await client.query(
            `INSERT INTO purchase_return_items
               (return_id, batch_id, quantity, credit_rate, line_credit)
             VALUES ($1, $2, $3, $4, $5)`,
            [returnId, item.batch_id, item.quantity, item.credit_rate, item.line_credit]
          );
  
          // Deduct Stock
          await client.query(
            `INSERT INTO stock_movements
               (batch_id, movement_type, quantity, reference_type, reference_id, notes)
             VALUES ($1, 'purchase_return', $2, 'purchase_return', $3, 'Purchase Return')`,
            [item.batch_id, item.quantity, returnId]
          );
        }
      }
  
      // H8: opening_balance is immutable historical fact — it must never be mutated by
      // transactional activity (previously this handler decremented it here). Note:
      // v_supplier_ap does not currently net purchase_returns.total_credit against the
      // payable balance either (same pre-existing gap as v_customer_ar/sale_returns on
      // the customer side) — flagged in the P1 report as out-of-scope for this fix since
      // it requires a view change beyond the fan-out/ageing rebase (C4/H7/M18) this
      // session was scoped to.

      await client.query("COMMIT");
      return { success: true, returnId };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ add-purchase-return error:", err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }));
}
