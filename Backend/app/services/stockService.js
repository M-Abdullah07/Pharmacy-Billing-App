
export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("get-batches", async () => {
    try {
      return await queryDb(
        `SELECT b.batch_id, b.batch_number, b.manufacturing_date,
                b.expiry_date, b.mrp, b.purchase_cost_per_unit,
                b.quantity_received, b.quantity_available, b.is_active,
                b.created_at,
                p.name AS product_name,
                p.uom  AS product_uom,
                s.name AS supplier_name,
                CASE
                  WHEN (b.expiry_date - CURRENT_DATE) <= 30 THEN 'critical'
                  WHEN (b.expiry_date - CURRENT_DATE) <= 60 THEN 'warning'
                  WHEN (b.expiry_date - CURRENT_DATE) <= 90 THEN 'watch'
                  ELSE 'normal'
                END AS expiry_status,
                (b.expiry_date - CURRENT_DATE) AS days_to_expiry
         FROM batches b
         JOIN products  p ON p.product_id  = b.product_id
         JOIN suppliers s ON s.supplier_id = b.supplier_id
         WHERE b.is_active = TRUE
         ORDER BY b.expiry_date ASC`
      );
    } catch (err) {
      console.error("❌ get-batches error:", err.message);
      return [];
    }
  });

  ipcMain.handle("add-batch", async (event, data) => {
    try {
      const result = await runDb(
        `INSERT INTO batches
           (product_id, supplier_id, purchase_invoice_id, batch_number,
            manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING batch_id`,
        [
          data.product_id,
          data.supplier_id,
          data.purchase_invoice_id || null,
          data.batch_number,
          data.manufacturing_date,
          data.expiry_date,
          data.mrp,
          data.purchase_cost_per_unit,
          data.quantity_received,
        ]
      );
      return { success: true, batchId: result.row.batch_id };
    } catch (err) {
      if (err.code === "23505") {
        return { success: false, error: "This batch number already exists for this product." };
      }
      console.error("❌ add-batch error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("get-batches-by-product", async (event, productId) => {
    try {
      return await queryDb(
        `SELECT batch_id, batch_number, expiry_date, mrp,
                purchase_cost_per_unit, quantity_available
         FROM batches
         WHERE product_id = $1 AND is_active = TRUE
         ORDER BY expiry_date ASC`,
        [productId]
      );
    } catch (err) {
      console.error("❌ get-batches-by-product error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-stock-summary", async () => {
    try {
      return await queryDb(
        `SELECT * FROM v_stock_summary ORDER BY stock_status, product_name`
      );
    } catch (err) {
      console.error("❌ get-stock-summary error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-stock-by-product", async (event, productId) => {
    try {
      return await queryDb(
        `SELECT b.batch_id, b.batch_number, b.expiry_date,
                b.mrp, b.quantity_available,
                (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
                CASE
                  WHEN (b.expiry_date - CURRENT_DATE) <= 30 THEN 'critical'
                  WHEN (b.expiry_date - CURRENT_DATE) <= 60 THEN 'warning'
                  WHEN (b.expiry_date - CURRENT_DATE) <= 90 THEN 'watch'
                  ELSE 'normal'
                END AS expiry_status
         FROM batches b
         WHERE b.product_id = $1
           AND b.is_active = TRUE
           AND b.quantity_available > 0
           AND b.expiry_date >= CURRENT_DATE
         ORDER BY b.expiry_date ASC`,
        [productId]
      );
    } catch (err) {
      console.error("❌ get-stock-by-product error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-near-expiry", async () => {
    try {
      return await queryDb(`SELECT * FROM v_near_expiry_batches`);
    } catch (err) {
      console.error("❌ get-near-expiry error:", err.message);
      return [];
    }
  });
}
