const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '..', 'Backend', 'app', '.env')
});
const argon2 = require('argon2');
const { Pool } = require("pg");
// ─── PostgreSQL Connection Pool ───────────────────────────────────────────────
if (!process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
  console.error("❌ ERROR: DB_PASSWORD or DATABASE_URL is not set in environment variables.");
  console.error("👉 Please copy Backend/app/.env.example to Backend/app/.env and configure your credentials.");
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "Pharmax",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  });
console.log(process.env.DB_NAME);
pool.on("error", (err) => {
  console.error("❌ Unexpected PostgreSQL pool error:", err.message);
});

// ─── Connection Test ──────────────────────────────────────────────────────────
async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW() AS now");
    console.log("✅ PostgreSQL connected at:", res.rows[0].now);

    // Schema sanity check
    const tables = ["users", "products", "manufacturers", "categories",
      "suppliers", "customers", "batches", "stock_movements", "settings"];

    // Ensure settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    for (const t of tables) {
      const check = await pool.query(
        `SELECT to_regclass('public.${t}') AS tbl`
      );
      const exists = check.rows[0].tbl !== null;
      console.log(`  ${exists ? "✅" : "❌"} Table: ${t}`);
    }
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    console.error("👉 Check your .env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
      ?? result.rows[0]?.supplier_id ?? result.rows[0]?.manufacturer_id
      ?? result.rows[0]?.batch_id ?? null,
    row: result.rows[0] ?? null,
  };
}


// ════════════════════════════════════════════════════════════════════════════
// AUTH  (users table — schema: user_id UUID, username, password_hash, role)
// ⚠️  PRODUCTION NOTE: schema stores bcrypt hashes in password_hash.
//     Currently using plain-text for development. Before go-live:
//     npm install bcryptjs  →  use bcrypt.hash() on signup,
//                              bcrypt.compare() on login.
// ════════════════════════════════════════════════════════════════════════════
ipcMain.handle("login-user", async (event, username, password) => {
  try {
    const rows = await queryDb(
      `SELECT user_id, password_hash, is_active, failed_attempts, locked_until, updated_at
       FROM users WHERE username = $1`,
      [username]
    );

    if (rows.length === 0) {
      return { success: false, error: "Invalid username or password." };
    }

    const user = rows[0];

    if (!user.is_active) {
      return { success: false, error: "Account is deactivated. Contact administrator." };
    }

    // ─── Reset failed_attempts if lock period has expired ───────────────────
    if (user.locked_until) {
      const now = new Date();
      const lockExpiredTime = new Date(user.locked_until);
      if (lockExpiredTime <= now) {
        await runDb(
          `UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1`,
          [user.user_id]
        );
        user.failed_attempts = 0;
        user.locked_until = null;
      }
    }

    // ─── Auto-reset failed_attempts if 24 hours have passed since last update ──
    const RESET_WINDOW_HOURS = 24;
    if (user.failed_attempts > 0 && user.updated_at) {
      const lastUpdate = new Date(user.updated_at);
      const now = new Date();
      const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
      if (hoursPassed >= RESET_WINDOW_HOURS) {
        await runDb(
          `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1`,
          [user.user_id]
        );
        user.failed_attempts = 0;
        user.locked_until = null;
      }
    }

    // UC-101 Alt Flow B — account lock check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.max(1, Math.ceil(
        (new Date(user.locked_until) - new Date()) / (1e3 * 60)
      ));
      return {
        success: false,
        error: `Account temporarily locked. Please try again after ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
      };
    }

    const passwordMatch = await argon2.verify(user.password_hash, password);

    if (!passwordMatch) {
      const newFailCount = (user.failed_attempts || 0) + 1;
      const lockUntil = newFailCount >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;

      await runDb(
        `UPDATE users
         SET failed_attempts = $1, locked_until = $2, updated_at = now()
         WHERE user_id = $3`,
        [newFailCount, lockUntil, user.user_id]
      );

      if (newFailCount >= 5) {
        const minutesLeft = Math.max(1, Math.ceil(
          (new Date(lockUntil) - new Date()) / (1000 * 60)
        ));
        return {
          success: false,
          error: `Account temporarily locked. Please try again after ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
        };
      }

      return { success: false, error: "Invalid username or password." };
    }

    // Successful login — reset counters
    await runDb(
      `UPDATE users
       SET failed_attempts = 0, locked_until = NULL,
           last_login_at = now(), updated_at = now()
       WHERE user_id = $1`,
      [user.user_id]
    );

    return { success: true, userId: user.user_id };
  } catch (err) {
    console.error("❌ login-user error:", err.message);
    return { success: false, error: "Service unavailable. Contact administrator." };
  }
});
ipcMain.handle("signup-user", async (event, username, password) => {
  try {
    const existing = await queryDb(
      `SELECT user_id FROM users WHERE username = $1`, [username]
    );
    if (existing.length > 0) {
      return { success: false, error: "Username already exists." };
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id });

    const result = await runDb(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2) RETURNING user_id`,
      [username, hash]
    );
    return { success: true, userId: result.row.user_id };
  } catch (err) {
    console.error("❌ signup-user error:", err.message);
    return { success: false, error: "Service unavailable. Contact administrator." };
  }
});
// ════════════════════════════════════════════════════════════════════════════
// MANUFACTURERS  (schema: manufacturer_id UUID, name, drap_mfg_licence,
//                 country, contact_number, email, is_active)
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-manufacturers", async () => {
  try {
    return await queryDb(
      `SELECT manufacturer_id, name, drap_mfg_licence, country,
              contact_number, email, is_active, created_at
       FROM manufacturers
       WHERE is_active = TRUE
       ORDER BY name`
    );
  } catch (err) {
    console.error("❌ get-manufacturers error:", err.message);
    return [];
  }
});

ipcMain.handle("add-manufacturer", async (event, data) => {
  try {
    const result = await runDb(
      `INSERT INTO manufacturers (name, drap_mfg_licence, country, contact_number, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING manufacturer_id`,
      [
        data.name,
        data.drap_mfg_licence || null,
        data.country || "Pakistan",
        data.contact_number || null,
        data.email || null,
      ]
    );
    return { success: true, manufacturerId: result.row.manufacturer_id };
  } catch (err) {
    if (err.code === "23505") {
      return { success: false, error: "A manufacturer with this name already exists." };
    }
    console.error("❌ add-manufacturer error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("update-manufacturer", async (event, id, data) => {
  try {
    await runDb(
      `UPDATE manufacturers
       SET name = $1, drap_mfg_licence = $2, country = $3,
           contact_number = $4, email = $5, updated_at = now()
       WHERE manufacturer_id = $6`,
      [
        data.name,
        data.drap_mfg_licence || null,
        data.country || "Pakistan",
        data.contact_number || null,
        data.email || null,
        id,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ update-manufacturer error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("deactivate-manufacturer", async (event, id) => {
  try {
    await runDb(
      `UPDATE manufacturers
       SET is_active = FALSE, deactivated_at = now(), updated_at = now()
       WHERE manufacturer_id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ deactivate-manufacturer error:", err.message);
    return { success: false, error: err.message };
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CATEGORIES  (schema: category_id UUID, name, description, is_active)
//             Pre-seeded by pharmax_schema.sql — no add/edit needed for Iter 1
// ════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS  (schema: product_id UUID, name, manufacturer_id FK, category_id FK,
//            form, uom, quantity_in_uom, hsn_code, gst_rate ENUM(0/5/12/18/28),
//            drug_schedule ENUM, generic_formula, default_sale_rate,
//            default_purchase_rate, shelf_no, is_active)
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-products", async () => {
  try {
    return await queryDb(
      `SELECT p.product_id, p.name, p.form, p.uom, p.quantity_in_uom,
              p.hsn_code, p.gst_rate, p.drug_schedule, p.generic_formula,
              p.default_sale_rate, p.default_purchase_rate,
              p.shelf_no, p.is_active, p.requires_prescription, p.created_at,
              m.name AS manufacturer_name,
              c.name AS category_name
       FROM products p
       LEFT JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
       LEFT JOIN categories    c ON c.category_id     = p.category_id
       WHERE p.is_active = TRUE
       ORDER BY p.name`
    );
  } catch (err) {
    console.error("❌ get-products error:", err.message);
    return [];
  }
});

// Alias kept for components that call getProducts (camelCase)
ipcMain.handle("getProducts", async () => {
  try {
    return await queryDb(
      `SELECT p.product_id, p.name, p.form, p.uom,
              p.gst_rate, p.drug_schedule, p.default_sale_rate,
              m.name AS manufacturer_name,
              c.name AS category_name
       FROM products p
       LEFT JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
       LEFT JOIN categories    c ON c.category_id     = p.category_id
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

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIERS  (schema: supplier_id UUID, name, strn, ntn, drug_licence_no,
//             address, city, payment_terms, credit_period_days, is_active)
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-suppliers", async () => {
  try {
    return await queryDb(
      `SELECT supplier_id, name, strn, ntn, drug_licence_no,
              address, city, payment_terms, credit_period_days,
              is_active, created_at
       FROM suppliers
       WHERE is_active = TRUE
       ORDER BY name`
    );
  } catch (err) {
    console.error("❌ get-suppliers error:", err.message);
    return [];
  }
});

ipcMain.handle("add-supplier", async (event, data) => {
  try {
    const result = await runDb(
      `INSERT INTO suppliers
         (name, strn, ntn, drug_licence_no, address, city, payment_terms, credit_period_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING supplier_id`,
      [
        data.name,
        data.strn || null,
        data.ntn || null,
        data.drug_licence_no || null,
        data.address || null,
        data.city || null,
        data.payment_terms || null,
        data.credit_period_days ?? 0,
      ]
    );
    return { success: true, supplierId: result.row.supplier_id };
  } catch (err) {
    if (err.code === "23505") {
      return { success: false, error: "STRN or NTN already registered for another supplier." };
    }
    console.error("❌ add-supplier error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("update-supplier", async (event, id, data) => {
  try {
    await runDb(
      `UPDATE suppliers
       SET name = $1, strn = $2, ntn = $3, drug_licence_no = $4,
           address = $5, city = $6, payment_terms = $7,
           credit_period_days = $8, updated_at = now()
       WHERE supplier_id = $9`,
      [
        data.name,
        data.strn || null,
        data.ntn || null,
        data.drug_licence_no || null,
        data.address || null,
        data.city || null,
        data.payment_terms || null,
        data.credit_period_days ?? 0,
        id,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ update-supplier error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("deactivate-supplier", async (event, id) => {
  try {
    await runDb(
      `UPDATE suppliers
       SET is_active = FALSE, deactivated_at = now(), updated_at = now()
       WHERE supplier_id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ deactivate-supplier error:", err.message);
    return { success: false, error: err.message };
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS  (schema: customer_id UUID, name, strn, ntn, drug_licence_no,
//             address, city, territory TEXT, customer_type ENUM,
//             credit_limit, payment_terms, is_active)
//
// ⚠️  BREAKING CHANGE from old schema:
//     - area_id / Area table are GONE — territory is now a plain TEXT field
//     - If AddCustomers.jsx still sends area_id, update that form to send
//       territory (string) instead
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-customers", async () => {
  try {
    return await queryDb(
      `SELECT customer_id, name, strn, ntn, drug_licence_no,
              address, city, territory, customer_type,
              credit_limit, payment_terms, is_active, created_at
       FROM customers
       WHERE is_active = TRUE
       ORDER BY name`
    );
  } catch (err) {
    console.error("❌ get-customers error:", err.message);
    return [];
  }
});

ipcMain.handle("add-customer", async (event, data) => {
  try {
    const result = await runDb(
      `INSERT INTO customers
         (name, strn, ntn, drug_licence_no, address, city,
          territory, customer_type, credit_limit, payment_terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING customer_id`,
      [
        data.name,
        data.strn || null,
        data.ntn || null,
        data.drug_licence_no || null,
        data.address || null,
        data.city || null,
        data.territory || null,
        data.customer_type || "retailer",
        data.credit_limit ?? 0,
        data.payment_terms || null,
      ]
    );
    return { success: true, customerId: result.row.customer_id };
  } catch (err) {
    if (err.code === "23505") {
      return { success: false, error: "STRN already registered for another customer." };
    }
    console.error("❌ add-customer error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("update-customer", async (event, id, data) => {
  try {
    await runDb(
      `UPDATE customers
       SET name = $1, strn = $2, ntn = $3, drug_licence_no = $4,
           address = $5, city = $6, territory = $7,
           customer_type = $8, credit_limit = $9,
           payment_terms = $10, updated_at = now()
       WHERE customer_id = $11`,
      [
        data.name,
        data.strn || null,
        data.ntn || null,
        data.drug_licence_no || null,
        data.address || null,
        data.city || null,
        data.territory || null,
        data.customer_type || "retailer",
        data.credit_limit ?? 0,
        data.payment_terms || null,
        id,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ update-customer error:", err.message);
    return { success: false, error: err.message };
  }
});

// Soft-delete — hard DELETE breaks invoice/ledger history
ipcMain.handle("delete-customer", async (event, id) => {
  try {
    await runDb(
      `UPDATE customers
       SET is_active = FALSE, deactivated_at = now(), updated_at = now()
       WHERE customer_id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ delete-customer error:", err.message);
    return { success: false, error: err.message };
  }
});

// ── Contact Persons ───────────────────────────────────────────────────────────
ipcMain.handle("add-contact-person", async (event, data) => {
  try {
    const result = await runDb(
      `INSERT INTO contact_persons
         (entity_type, entity_id, name, role, contact_number, email, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING contact_id`,
      [
        data.entity_type,
        data.entity_id,
        data.name,
        data.role || null,
        data.contact_number || null,
        data.email || null,
        data.is_primary ?? false,
      ]
    );
    return { success: true, contactId: result.row.contact_id };
  } catch (err) {
    console.error("❌ add-contact-person error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-contact-persons", async (event, entityType, entityId) => {
  try {
    return await queryDb(
      `SELECT contact_id, name, role, contact_number, email, is_primary
       FROM contact_persons
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY is_primary DESC, created_at ASC`,
      [entityType, entityId]
    );
  } catch (err) {
    console.error("❌ get-contact-persons error:", err.message);
    return [];
  }
});

ipcMain.handle("delete-contact-person", async (event, contactId) => {
  try {
    await runDb(
      `DELETE FROM contact_persons WHERE contact_id = $1`,
      [contactId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ delete-contact-person error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("reactivate-supplier", async (event, id) => {
  try {
    await runDb(
      `UPDATE suppliers
       SET is_active = TRUE, deactivated_at = NULL, updated_at = now()
       WHERE supplier_id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ reactivate-supplier error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("reactivate-customer", async (event, id) => {
  try {
    await runDb(
      `UPDATE customers
       SET is_active = TRUE, deactivated_at = NULL, updated_at = now()
       WHERE customer_id = $1`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ reactivate-customer error:", err.message);
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
// ════════════════════════════════════════════════════════════════════════════
// BATCHES  (schema: batch_id UUID, product_id FK, supplier_id FK,
//           purchase_invoice_id FK nullable, batch_number,
//           manufacturing_date, expiry_date, mrp, purchase_cost_per_unit,
//           quantity_received, quantity_available — trigger-maintained)
//
// KEY: the schema trigger trg_batch_insert_opening_movement fires on INSERT
// and auto-creates a stock_movement record + updates quantity_available.
// You do NOT manually touch quantity_available.
// ════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════
// STOCK VIEW  (uses v_stock_summary view — defined in pharmax_schema.sql)
// ════════════════════════════════════════════════════════════════════════════

// ── Purchase Invoices (GRN) ───────────────────────────────────────────────────

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

ipcMain.handle("add-purchase-invoice", async (event, data) => {
  try {
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
});

ipcMain.handle("add-purchase-invoice-item", async (event, data) => {
  try {
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
});

ipcMain.handle("confirm-purchase-invoice", async (event, id, userId) => {
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

    for (const item of items) {
      // Check if batch already exists for this product
      const existingBatch = await client.query(
        `SELECT batch_id, quantity_available FROM batches
         WHERE product_id = $1 AND batch_number = $2`,
        [item.product_id, item.batch_number]
      );

      if (existingBatch.rows.length > 0) {
        // Existing batch — insert stock movement directly
        const batchId = existingBatch.rows[0].batch_id;
        await client.query(
          `INSERT INTO stock_movements
             (batch_id, movement_type, quantity, reference_type, reference_id, notes)
           VALUES ($1, 'purchase', $2, 'purchase_invoice', $3, 'GRN confirmation')`,
          [batchId, item.quantity, id]
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
            header.supplier_id,
            id,
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

    // Update supplier payable (opening_balance += net_payable)
    await client.query(
      `UPDATE suppliers
       SET opening_balance = opening_balance + $1, updated_at = now()
       WHERE supplier_id = $2`,
      [header.net_payable, header.supplier_id]
    );

    // Confirm the invoice
    await client.query(
      `UPDATE purchase_invoices
      SET status = 'confirmed',
          confirmed_at = now(),
          confirmed_by = $2,
          updated_at = now()
      WHERE purchase_invoice_id = $1`,
      [id, userId]
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
});

ipcMain.handle("cancel-purchase-invoice", async (event, id) => {
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

// ════════════════════════════════════════════════════════════════════════════
// COMPANIES  (backward compat for Companies.jsx + preload.js)
// The old "companies" table is now "suppliers" in the new schema.
// These handlers map to suppliers so Companies.jsx keeps working.
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-companies", async () => {
  try {
    return await queryDb(
      `SELECT supplier_id AS id, name, city AS address,
              null AS contact, ntn, null AS contact_person, created_at
       FROM suppliers
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );
  } catch (err) {
    console.error("❌ get-companies error:", err.message);
    return [];
  }
});

ipcMain.handle("add-company", async (event, data) => {
  try {
    await runDb(
      `INSERT INTO suppliers (name, city, ntn)
       VALUES ($1, $2, $3)`,
      [data.name, data.address || null, data.ntn || null]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ add-company error:", err.message);
    return { success: false, error: err.message };
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SALES  (sale_invoices, sale_invoice_items, stock movements)
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle("add-sale", async (event, data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create sale invoice
    const invoiceResult = await client.query(
      `INSERT INTO sale_invoices
         (customer_id, invoice_date, subtotal, discount_amount, tax_amount, net_receivable, amount_paid, status)
       VALUES ($1, NOW(), $2, 0, 0, $2, $3, 'confirmed')
       RETURNING sale_invoice_id`,
      [data.customerId, data.totalAmount, data.isCredit ? 0 : data.totalAmount]
    );
    const saleInvoiceId = invoiceResult.rows[0].sale_invoice_id;

    // Add sale items and update stock
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        // Fetch mrp from batch for the schema requirement
        const batchRes = await client.query('SELECT mrp, product_id FROM batches WHERE batch_id = $1', [item.batchId]);
        const mrp = batchRes.rows[0]?.mrp || item.saleRate;
        const productId = batchRes.rows[0]?.product_id;

        await client.query(
          `INSERT INTO sale_invoice_items
             (sale_invoice_id, product_id, batch_id, quantity, mrp, sale_rate, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [saleInvoiceId, productId, item.batchId, item.quantity, mrp, item.saleRate, item.totalAmount]
        );

        // Update stock movement
        await client.query(
          `INSERT INTO stock_movements
             (batch_id, movement_type, quantity, reference_type, reference_id, notes)
           VALUES ($1, 'sale', $2, 'sale_invoice', $3, 'Sale transaction')`,
          [item.batchId, item.quantity, saleInvoiceId]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, saleId: saleInvoiceId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ add-sale error:", err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REMOVED HANDLERS  — these no longer exist in pharmax_schema.sql
// ─────────────────────────────────────────────────────────────────────────
// ❌ add-area / get-areas  → Area table dropped. Use territory TEXT on customers.
// ❌ add-medicine          → medicines table dropped. Use products + batches.
// ❌ insert-sale           → Use sale_invoices + sale_invoice_items (Iteration 2).
//
// If your .jsx pages still call these you will see:
//   "Error invoking remote method: No handler registered for 'add-area'"
// Update those pages to use the new handlers listed above.
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE RETURNS
// ════════════════════════════════════════════════════════════════════════════

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

ipcMain.handle("add-purchase-return", async (event, data) => {
  const client = await pool.connect();
  try {
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
        data.user_id || null
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

    // 3. Update Supplier Payable Balance
    await client.query(
      `UPDATE suppliers
       SET opening_balance = opening_balance - $1, updated_at = now()
       WHERE supplier_id = $2`,
      [data.total_credit || 0, data.supplier_id]
    );

    await client.query("COMMIT");
    return { success: true, returnId };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ add-purchase-return error:", err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER LEDGER & PAYABLES
// ════════════════════════════════════════════════════════════════════════════

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

ipcMain.handle("backup-database", async () => {
  try {
    const tables = ["users", "products", "manufacturers", "categories", "suppliers", "customers", "batches", "stock_movements", "sale_invoices", "sale_invoice_items"];
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

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const isDev = process.argv.some(
    (arg) =>
      arg.includes("--no-sandbox") ||
      arg.includes("--inspect") ||
      arg.includes("electron")
  );

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../Frontend/dist/index.html"));
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await testConnection();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", async () => {
  console.log("🔴 window-all-closed fired");

  if (process.platform !== "darwin") {
    console.log("🔵 Platform is not darwin, proceeding...");

    try {
      const { session } = require("electron");
      console.log("🔵 Got electron session");

      await session.defaultSession.clearStorageData({
        storages: ["localstorage"],
      });
      console.log("✅ localStorage cleared successfully");
    } catch (err) {
      console.error("❌ Failed to clear localStorage:", err.message);
    }

    try {
      await pool.end();
      console.log("✅ PostgreSQL pool closed");
    } catch (err) {
      console.error("❌ Failed to close pool:", err.message);
    }

    console.log("🔴 Calling app.quit()");
    app.quit();
  } else {
    console.log("⚠️ Platform is darwin — skipping cleanup");
  }
});