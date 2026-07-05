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

test('Integration Test: Manufacturer Lifecycle & Relationship Integrity', async (t) => {
  let domesticManufacturerId, importedManufacturerId, categoryId, productId1, productId2;
  const timestamp = Date.now();

  // ──────────────────────────────────────────────────────────────────────────
  // SETUP PHASE: Create test fixtures
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Setup: Create categories and manufacturers', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create a test category
      const catRes = await client.query(`
        INSERT INTO categories (name, description)
        VALUES ($1, 'Test category for manufacturer integration')
        ON CONFLICT (name) DO NOTHING
        RETURNING category_id
      `, [`Test_Category_${timestamp}`]);
      
      // If insert returned nothing, fetch existing category
      if (catRes.rows.length === 0) {
        const existing = await client.query(
          'SELECT category_id FROM categories WHERE name = $1',
          [`Test_Category_${timestamp}`]
        );
        categoryId = existing.rows[0].category_id;
      } else {
        categoryId = catRes.rows[0].category_id;
      }

      // Create domestic manufacturer (Pakistan)
      const domesticRes = await client.query(`
        INSERT INTO manufacturers
          (name, drap_mfg_licence, country, contact_number, email, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING manufacturer_id
      `, [
        `Domestic Pharma ${timestamp}`,
        'DRL-2024-001',
        'Pakistan',
        '+92-300-1234567',
        `contact_domestic_${timestamp}@pharma.pk`
      ]);
      domesticManufacturerId = domesticRes.rows[0].manufacturer_id;

      // Create imported manufacturer (non-Pakistan)
      const importedRes = await client.query(`
        INSERT INTO manufacturers
          (name, drap_mfg_licence, country, contact_number, email, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING manufacturer_id
      `, [
        `Imported Pharma ${timestamp}`,
        'IMP-2024-001',
        'Switzerland',
        '+41-44-1234567',
        `contact_imported_${timestamp}@pharma.ch`
      ]);
      importedManufacturerId = importedRes.rows[0].manufacturer_id;

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // EXECUTION PHASE: Test manufacturer data integrity
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Verify: Manufacturers created with correct attributes', async () => {
    const result = await pool.query(`
      SELECT manufacturer_id, name, drap_mfg_licence, country, email, is_active, created_at
      FROM manufacturers
      WHERE manufacturer_id = $1 OR manufacturer_id = $2
      ORDER BY name
    `, [domesticManufacturerId, importedManufacturerId]);

    assert.strictEqual(result.rows.length, 2, 'Both manufacturers should exist');

    // Check domestic manufacturer
    const domestic = result.rows.find(m => m.manufacturer_id === domesticManufacturerId);
    assert.ok(domestic, 'Domestic manufacturer should be found');
    assert.strictEqual(domestic.country, 'Pakistan', 'Domestic country should be Pakistan');
    assert.strictEqual(domestic.drap_mfg_licence, 'DRL-2024-001');
    assert.strictEqual(domestic.is_active, true);
    assert.ok(domestic.created_at, 'Created timestamp should exist');

    // Check imported manufacturer
    const imported = result.rows.find(m => m.manufacturer_id === importedManufacturerId);
    assert.ok(imported, 'Imported manufacturer should be found');
    assert.strictEqual(imported.country, 'Switzerland', 'Imported country should match');
    assert.strictEqual(imported.drap_mfg_licence, 'IMP-2024-001');
    assert.strictEqual(imported.is_active, true);
  });

  await t.test('Verify: Full-text search on manufacturers', async () => {
    const result = await pool.query(`
      SELECT manufacturer_id, name
      FROM manufacturers
      WHERE search_vector @@ to_tsquery('english', 'Pharma')
      AND (manufacturer_id = $1 OR manufacturer_id = $2)
    `, [domesticManufacturerId, importedManufacturerId]);

    assert.ok(result.rows.length >= 2, 'Both manufacturers should be found by FTS');
    assert.ok(
      result.rows.some(m => m.manufacturer_id === domesticManufacturerId),
      'Domestic manufacturer should be in FTS results'
    );
    assert.ok(
      result.rows.some(m => m.manufacturer_id === importedManufacturerId),
      'Imported manufacturer should be in FTS results'
    );
  });

  await t.test('Verify: Unique constraint on manufacturer name', async () => {
    const client = await pool.connect();
    try {
      await assert.rejects(async () => {
        await client.query(`
          INSERT INTO manufacturers (name, country)
          VALUES ($1, 'Pakistan')
        `, [`Domestic Pharma ${timestamp}`]);
      }, /unique constraint/i);
    } finally {
      client.release();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCT RELATIONSHIP PHASE: Test FK constraints
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Setup: Create products using manufacturers', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Product 1: Using domestic manufacturer
      const prod1Res = await client.query(`
        INSERT INTO products
          (name, manufacturer_id, category_id, form, uom, quantity_in_uom,
           gst_rate, drug_schedule, generic_formula)
        VALUES ($1, $2, $3, 'Tablet', 'Strip', 10, 18, 'G', 'Paracetamol 500mg')
        RETURNING product_id
      `, [`Domestic Product ${timestamp}`, domesticManufacturerId, categoryId]);
      productId1 = prod1Res.rows[0].product_id;

      // Product 2: Using imported manufacturer
      const prod2Res = await client.query(`
        INSERT INTO products
          (name, manufacturer_id, category_id, form, uom, quantity_in_uom,
           gst_rate, drug_schedule, generic_formula)
        VALUES ($1, $2, $3, 'Injection', 'Vial', 1, 1, 'H', 'Insulin Glargine 100U/ml')
        RETURNING product_id
      `, [`Imported Product ${timestamp}`, importedManufacturerId, categoryId]);
      productId2 = prod2Res.rows[0].product_id;

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  await t.test('Verify: Products linked correctly to manufacturers', async () => {
    const result = await pool.query(`
      SELECT p.product_id, p.name, p.manufacturer_id, m.name AS manufacturer_name, m.country
      FROM products p
      JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
      WHERE p.product_id = $1 OR p.product_id = $2
      ORDER BY p.product_id
    `, [productId1, productId2]);

    assert.strictEqual(result.rows.length, 2, 'Both products should exist with manufacturers');

    const prod1 = result.rows.find(p => p.product_id === productId1);
    assert.strictEqual(prod1.manufacturer_id, domesticManufacturerId);
    assert.strictEqual(prod1.country, 'Pakistan');

    const prod2 = result.rows.find(p => p.product_id === productId2);
    assert.strictEqual(prod2.manufacturer_id, importedManufacturerId);
    assert.strictEqual(prod2.country, 'Switzerland');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LIFECYCLE PHASE: Test deactivation and reactivation
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Execute: Deactivate domestic manufacturer', async () => {
    await pool.query(`
      UPDATE manufacturers
      SET is_active = FALSE, deactivated_at = now()
      WHERE manufacturer_id = $1
    `, [domesticManufacturerId]);

    const result = await pool.query(
      'SELECT is_active, deactivated_at FROM manufacturers WHERE manufacturer_id = $1',
      [domesticManufacturerId]
    );
    assert.strictEqual(result.rows[0].is_active, false);
    assert.ok(result.rows[0].deactivated_at);
  });

  await t.test('Verify: Deactivated status visible in products', async () => {
    const result = await pool.query(`
      SELECT p.name, m.is_active, m.deactivated_at
      FROM products p
      JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
      WHERE p.product_id = $1
    `, [productId1]);

    assert.strictEqual(result.rows[0].is_active, false);
    assert.ok(result.rows[0].deactivated_at);
  });

  await t.test('Execute: Reactivate domestic manufacturer', async () => {
    // Simulating the "reactivate-manufacturer" handler
    await pool.query(`
      UPDATE manufacturers
      SET is_active = TRUE, deactivated_at = NULL, updated_at = now()
      WHERE manufacturer_id = $1
    `, [domesticManufacturerId]);

    const result = await pool.query(
      'SELECT is_active, deactivated_at FROM manufacturers WHERE manufacturer_id = $1',
      [domesticManufacturerId]
    );
    assert.strictEqual(result.rows[0].is_active, true);
    assert.strictEqual(result.rows[0].deactivated_at, null);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CONSTRAINT VALIDATION PHASE: Test safety constraints
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Verify: Cannot delete manufacturer with products (FK protection)', async () => {
    const client = await pool.connect();
    try {
      await assert.rejects(async () => {
        await client.query(`
          DELETE FROM manufacturers WHERE manufacturer_id = $1
        `, [domesticManufacturerId]);
      }, /foreign key constraint/i);
    } finally {
      client.release();
    }
  });

  await t.test('Verify: Deactivation check constraint enforced', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Try to set is_active = FALSE without deactivated_at (should fail)
      await assert.rejects(async () => {
        await client.query(`
          INSERT INTO manufacturers (name, country, is_active, deactivated_at)
          VALUES ($1, 'USA', FALSE, NULL)
        `, [`Invalid Pharma ${timestamp}`]);
      }, /check constraint|chk_manufacturers_deactivated/i);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // REPORTING PHASE: Test read-side queries
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Execute: Generate manufacturer report', async () => {
    const result = await pool.query(`
      SELECT
        m.manufacturer_id,
        m.name,
        m.country,
        CASE WHEN m.country = 'Pakistan' THEN FALSE ELSE TRUE END AS is_imported,
        COUNT(p.product_id)::INTEGER AS product_count,
        m.is_active,
        m.created_at
      FROM manufacturers m
      LEFT JOIN products p ON p.manufacturer_id = m.manufacturer_id
      WHERE m.manufacturer_id = $1 OR m.manufacturer_id = $2
      GROUP BY m.manufacturer_id, m.name, m.country, m.is_active, m.created_at
      ORDER BY m.name
    `, [domesticManufacturerId, importedManufacturerId]);

    assert.strictEqual(result.rows.length, 2, 'Report should include both manufacturers');

    const domestic = result.rows.find(m => m.manufacturer_id === domesticManufacturerId);
    assert.strictEqual(domestic.is_imported, false);
    assert.strictEqual(domestic.product_count, 1, 'Domestic manufacturer should have 1 product');

    const imported = result.rows.find(m => m.manufacturer_id === importedManufacturerId);
    assert.strictEqual(imported.is_imported, true);
    assert.strictEqual(imported.product_count, 1, 'Imported manufacturer should have 1 product');
  });

  await t.test('Verify: Product cascade behavior on manufacturer update', async () => {
    // Update manufacturer name
    const newName = `Updated Pharma ${timestamp}`;
    await pool.query(`
      UPDATE manufacturers
      SET name = $1, updated_at = now()
      WHERE manufacturer_id = $2
    `, [newName, domesticManufacturerId]);

    // Products should still reference the manufacturer
    const result = await pool.query(`
      SELECT p.product_id, m.name
      FROM products p
      JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
      WHERE p.manufacturer_id = $1
    `, [domesticManufacturerId]);

    assert.ok(result.rows.length > 0, 'Products should still exist after manufacturer name update');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AUDIT TRAIL PHASE: Verify timestamps
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Verify: Timestamp tracking on manufacturers', async () => {
    const result = await pool.query(`
      SELECT
        created_at,
        updated_at,
        deactivated_at,
        (updated_at >= created_at) AS updated_after_created
      FROM manufacturers
      WHERE manufacturer_id = $1
    `, [domesticManufacturerId]);

    assert.ok(result.rows[0].created_at);
    assert.ok(result.rows[0].updated_at);
    assert.strictEqual(result.rows[0].updated_after_created, true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEARDOWN PHASE: Clean up test data
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('Teardown: Delete test products and manufacturers', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete products (will cascade delete related data)
      await client.query('DELETE FROM products WHERE product_id = $1 OR product_id = $2', [productId1, productId2]);

      // Delete manufacturers
      await client.query('DELETE FROM manufacturers WHERE manufacturer_id = $1 OR manufacturer_id = $2',
        [domesticManufacturerId, importedManufacturerId]);

      // Delete category
      await client.query('DELETE FROM categories WHERE category_id = $1', [categoryId]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Close pool
  await pool.end();
});
