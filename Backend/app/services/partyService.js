import { requireAuth } from "./session.js";

export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

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

  ipcMain.handle("get-suppliers-with-contact", async () => {
    try {
      return await queryDb(
        `SELECT s.supplier_id, s.name, s.strn, s.ntn, s.drug_licence_no,
                s.address, s.city, s.payment_terms, s.credit_period_days,
                s.is_active, s.created_at,
                cp.name AS primary_contact_name,
                cp.contact_number AS primary_contact_number
         FROM suppliers s
         LEFT JOIN contact_persons cp
           ON cp.entity_id = s.supplier_id
           AND cp.entity_type = 'supplier'
           AND cp.is_primary = TRUE
         ORDER BY s.name`
      );
    } catch (err) {
      console.error("❌ get-suppliers-with-contact error:", err.message);
      return [];
    }
  });

  ipcMain.handle("add-supplier", requireAuth(async (event, data) => {
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
  }));

  ipcMain.handle("update-supplier", requireAuth(async (event, id, data) => {
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
  }));

  ipcMain.handle("deactivate-supplier", requireAuth(async (event, id) => {
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
  }));

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

  ipcMain.handle("get-customers-with-contact", async () => {
    try {
      return await queryDb(
        `SELECT c.customer_id, c.name, c.strn, c.ntn, c.drug_licence_no,
                c.address, c.city, c.territory, c.customer_type,
                c.credit_limit, c.payment_terms, c.is_active, c.created_at,
                cp.name AS primary_contact_name,
                cp.contact_number AS primary_contact_number
         FROM customers c
         LEFT JOIN contact_persons cp
           ON cp.entity_id = c.customer_id
           AND cp.entity_type = 'customer'
           AND cp.is_primary = TRUE
         ORDER BY c.name`
      );
    } catch (err) {
      console.error("❌ get-customers-with-contact error:", err.message);
      return [];
    }
  });

  ipcMain.handle("add-customer", requireAuth(async (event, data) => {
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
  }));

  ipcMain.handle("update-customer", requireAuth(async (event, id, data) => {
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
  }));

  ipcMain.handle("delete-customer", requireAuth(async (event, id) => {
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
  }));

  ipcMain.handle("add-contact-person", requireAuth(async (event, data) => {
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
  }));

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

  ipcMain.handle("delete-contact-person", requireAuth(async (event, contactId) => {
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
  }));

  ipcMain.handle("reactivate-supplier", requireAuth(async (event, id) => {
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
  }));

  ipcMain.handle("reactivate-customer", requireAuth(async (event, id) => {
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
  }));

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

  ipcMain.handle("add-company", requireAuth(async (event, data) => {
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
  }));
}
