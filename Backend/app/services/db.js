import pg from "pg";
const { Pool } = pg;

// Lazy pool — created on first access so dotenv.config() has already run.
// ESM static imports are hoisted above any synchronous code, so eager
// initialization would read undefined env vars.
let _pool = null;
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "Pharmax",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
    });
    _pool.on("error", (err) => {
      console.error("❌ Unexpected PostgreSQL pool error:", err.message);
    });
  }
  return _pool;
}

// pool object — methods are bound at call-time via getPool() to avoid
// losing `this` context that a Proxy getter would cause.
const pool = {
  query: (...args) => getPool().query(...args),
  end:   (...args) => getPool().end(...args),
  on:    (...args) => getPool().on(...args),
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
