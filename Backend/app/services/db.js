import pg from "pg";
import { getDbConfig } from "../config.js";
const { Pool } = pg;

// Lazy pool — created on first access so dotenv.config()/config.js resolution
// has already run. ESM static imports are hoisted above any synchronous code,
// so eager initialization would read undefined env vars.
//
// M20: connection settings (host/port/database/user/password/ssl) now come
// from config.js's getDbConfig(), which layers dbconfig.json (Electron
// userData dir) over process.env over hardcoded defaults. This is the single
// resolution path for both customer-hosted and self-hosted deployments — the
// only difference between them is the contents of dbconfig.json.
let _poolPromise = null;
function getPool() {
  if (!_poolPromise) {
    _poolPromise = getDbConfig().then((cfg) => {
      const pool = new Pool({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        ssl: cfg.ssl,
      });
      pool.on("error", (err) => {
        console.error("❌ Unexpected PostgreSQL pool error:", err.message);
      });
      return pool;
    });
  }
  return _poolPromise;
}

// pool object — methods are bound at call-time via getPool() to avoid
// losing `this` context that a Proxy getter would cause. getPool() now
// resolves asynchronously (config file I/O + optional electron import), so
// every method awaits the shared pool promise before delegating.
const pool = {
  query:   async (...args) => (await getPool()).query(...args),
  connect: async (...args) => (await getPool()).connect(...args),
  end:     async (...args) => (await getPool()).end(...args),
  on:      async (...args) => (await getPool()).on(...args),
};

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW() AS now");
    console.log("✅ PostgreSQL connected at:", res.rows[0].now);

    const tables = ["users", "products", "categories",
      "suppliers", "customers", "batches", "stock_movements", "settings"];

    await pool.query(
      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())"
    );

    for (const t of tables) {
      const check = await pool.query("SELECT to_regclass('public." + t + "') AS tbl");
      const exists = check.rows[0].tbl !== null;
      console.log("  " + (exists ? "✅" : "❌") + " Table: " + t);
    }
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
  }
}

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
      ?? result.rows[0]?.supplier_id
      ?? result.rows[0]?.batch_id ?? null,
    row: result.rows[0] ?? null,
  };
}

export { pool, queryDb, runDb, testConnection };
