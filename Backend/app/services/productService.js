
export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("get-categories", async () => {
    try {
      return await queryDb(
        `SELECT category_id, name, description
         FROM categories
         WHERE is_active = TRUE
         ORDER BY name`
      );
    } catch (err) {
      console.error("❌ get-categories error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-products", async () => {
    try {
      return await queryDb(
        `SELECT p.product_id, p.name, p.form, p.uom, p.quantity_in_uom,
                p.hsn_code, p.gst_rate, p.drug_schedule, p.generic_formula,
                p.default_sale_rate, p.default_purchase_rate,
                p.shelf_no, p.is_active, p.requires_prescription, p.created_at,
                s.name AS manufacturer_name,
                c.name AS category_name
         FROM products p
         LEFT JOIN suppliers s ON s.supplier_id = p.manufacturer_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         WHERE p.is_active = TRUE
         ORDER BY p.name`
      );
    } catch (err) {
      console.error("❌ get-products error:", err.message);
      return [];
    }
  });

  ipcMain.handle("get-all-products", async () => {
    try {
      return await queryDb(
        `SELECT p.product_id, p.name, p.form, p.uom, p.quantity_in_uom,
                p.hsn_code, p.gst_rate, p.drug_schedule, p.generic_formula,
                p.default_sale_rate, p.default_purchase_rate,
                p.shelf_no, p.is_active, p.requires_prescription,
                p.manufacturer_id, p.category_id, p.created_at,
                s.name AS manufacturer_name, c.name AS category_name
         FROM products p
         LEFT JOIN suppliers s ON s.supplier_id = p.manufacturer_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         ORDER BY p.name`
      );
    } catch (err) {
      console.error("❌ get-all-products error:", err.message);
      return [];
    }
  });

  ipcMain.handle("getProducts", async () => {
    try {
      return await queryDb(
        `SELECT p.product_id, p.name, p.form, p.uom,
                p.gst_rate, p.drug_schedule, p.default_sale_rate,
                s.name AS manufacturer_name,
                c.name AS category_name
         FROM products p
         LEFT JOIN suppliers s ON s.supplier_id = p.manufacturer_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         WHERE p.is_active = TRUE
         ORDER BY p.name`
      );
    } catch (err) {
      console.error("❌ getProducts error:", err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle("add-product", async (event, data) => {
    try {
      const result = await runDb(
        `INSERT INTO products (
           name, manufacturer_id, category_id, form, uom, quantity_in_uom,
           hsn_code, gst_rate, drug_schedule, generic_formula,
           default_sale_rate, default_purchase_rate, shelf_no
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING product_id`,
        [
          data.name,
          data.manufacturer_id || null,
          data.category_id || null,
          data.form || null,
          data.uom || "Strip",
          data.quantity_in_uom || 1,
          data.hsn_code || null,
          data.gst_rate ?? 0,
          data.drug_schedule || "OTC",
          data.generic_formula || null,
          data.default_sale_rate ?? 0,
          data.default_purchase_rate ?? 0,
          data.shelf_no || null,
        ]
      );
      return { success: true, productId: result.row.product_id };
    } catch (err) {
      if (err.code === "23505") {
        return { success: false, error: "A product with this name already exists." };
      }
      console.error("❌ add-product error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("update-product", async (event, id, data) => {
    try {
      await runDb(
        `UPDATE products
         SET name = $1, manufacturer_id = $2, category_id = $3,
             form = $4, uom = $5, quantity_in_uom = $6,
             hsn_code = $7, gst_rate = $8, drug_schedule = $9,
             generic_formula = $10, default_sale_rate = $11,
             default_purchase_rate = $12, shelf_no = $13, updated_at = now()
         WHERE product_id = $14`,
        [
          data.name,
          data.manufacturer_id || null,
          data.category_id || null,
          data.form || null,
          data.uom || "Strip",
          data.quantity_in_uom || 1,
          data.hsn_code || null,
          data.gst_rate ?? 0,
          data.drug_schedule || "OTC",
          data.generic_formula || null,
          data.default_sale_rate ?? 0,
          data.default_purchase_rate ?? 0,
          data.shelf_no || null,
          id,
        ]
      );
      return { success: true };
    } catch (err) {
      console.error("❌ update-product error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("deactivate-product", async (event, id) => {
    try {
      await runDb(
        `UPDATE products
         SET is_active = FALSE, deactivated_at = now(), updated_at = now()
         WHERE product_id = $1`,
        [id]
      );
      return { success: true };
    } catch (err) {
      console.error("❌ deactivate-product error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("reactivate-product", async (event, id) => {
    try {
      await runDb(
        `UPDATE products
         SET is_active = TRUE, deactivated_at = NULL, updated_at = now()
         WHERE product_id = $1`,
        [id]
      );
      return { success: true };
    } catch (err) {
      console.error("❌ reactivate-product error:", err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("reactivate-manufacturer", async (event, id) => {
    try {
      await runDb(
        `UPDATE manufacturers
         SET is_active = TRUE, deactivated_at = NULL, updated_at = now()
         WHERE manufacturer_id = $1`,
        [id]
      );
      return { success: true };
    } catch (err) {
      console.error("❌ reactivate-manufacturer error:", err.message);
      return { success: false, error: err.message };
    }
  });
}
