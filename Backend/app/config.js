import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── M20 + hosting-mode connection config ──────────────────────────────────
//
// Resolves DB connection settings identically regardless of who hosts the
// database (customer's own Postgres vs. a Postgres we host for them). The
// ONLY difference between those two deployments is the *contents* of
// dbconfig.json (host/ssl) — there is deliberately no `if (selfHosted)`
// branch anywhere in this file or in db.js.
//
// Priority order (highest wins):
//   1. JSON file at <userData>/dbconfig.json           { host, port, database, user, password, ssl }
//   2. process.env (populated by dotenv, best-effort)   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD / DB_SSL
//   3. Hardcoded defaults (local dev Postgres)
//
// Must degrade gracefully:
//   - Runs fine outside Electron (e.g. under node:test) — the `electron` import
//     is try/catch'd, so app.getPath() just isn't available and we skip straight
//     to env/defaults.
//   - A malformed/missing dbconfig.json never crashes startup — we log and fall
//     back to env/defaults.
//   - dotenv.config() failing to find a .env file (e.g. under asar, where the
//     file isn't packaged) never crashes startup either.

let dotenvLoaded = false;
async function loadDotenvOnce() {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  try {
    // The .env location depends on how we were launched, and CWD is NOT
    // reliable (electron-forge dev runs with CWD=Frontend/). Try
    // location-relative candidates first, CWD-relative last.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.join(here, ".env"),                                     // plain node: Backend/app/config.js
      path.join(here, "..", "..", "..", "Backend", "app", ".env"), // vite dev bundle: Frontend/.vite/build/main.js
      path.join(process.cwd(), "Backend", "app", ".env"),          // launched from repo root (tests)
      path.join(process.cwd(), ".env"),
    ];
    const envPath = candidates.find((p) => fs.existsSync(p));
    if (!envPath) return; // packaged/asar install — dbconfig.json is the source of truth
    const dotenv = await import("dotenv");
    dotenv.default.config({ path: envPath });
  } catch (err) {
    console.warn("⚠️  dotenv config skipped (safe to ignore under asar):", err.message);
  }
}

// ─── Try to read dbconfig.json from Electron's userData dir ───────────────
async function getUserDataDir() {
  try {
    // Dynamic import so this module can be loaded outside Electron (tests,
    // plain `node`) without throwing — `electron` simply won't resolve there
    // (or app.getPath will be unavailable) and we degrade to env/defaults.
    const electron = await import("electron");
    const app = electron.app ?? electron.default?.app;
    if (app && typeof app.getPath === "function") {
      return app.getPath("userData");
    }
  } catch (err) {
    // Not running inside Electron — ignore.
  }
  return null;
}

async function readDbConfigFile() {
  const userDataDir = await getUserDataDir();
  if (!userDataDir) return null;

  const configPath = path.join(userDataDir, "dbconfig.json");
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { parsed, configPath };
  } catch (err) {
    console.error(`❌ Failed to read/parse ${configPath}, falling back to env/defaults:`, err.message);
    return null;
  }
}

// Resolve `ssl` into the shape node-postgres (pg) expects: boolean or an
// object like { rejectUnauthorized }. Accepts true/false/object/undefined.
function resolveSsl(ssl) {
  if (ssl === undefined || ssl === null) return false;
  if (typeof ssl === "boolean") return ssl;
  if (typeof ssl === "object") return ssl;
  // Anything else (e.g. a stray string) — be conservative and disable SSL
  // rather than silently misconfiguring a connection.
  return false;
}

function resolveEnvSsl() {
  const raw = (process.env.DB_SSL || "").toLowerCase();
  return raw === "true" || raw === "1";
}

async function getDbConfig() {
  await loadDotenvOnce();

  const defaults = {
    host: "127.0.0.1",
    port: 5432,
    database: "Pharmax",
    user: "postgres",
    password: "",
    ssl: false,
  };

  const envConfig = {
    host: process.env.DB_HOST || defaults.host,
    port: Number(process.env.DB_PORT) || defaults.port,
    database: process.env.DB_NAME || defaults.database,
    user: process.env.DB_USER || defaults.user,
    password: process.env.DB_PASSWORD ?? defaults.password,
    ssl: resolveEnvSsl() || defaults.ssl,
  };

  const fileResult = await readDbConfigFile();
  if (!fileResult) return envConfig;

  const { parsed, configPath } = fileResult;
  console.log(`ℹ️  Using DB config from ${configPath}`);

  return {
    host: parsed.host ?? envConfig.host,
    port: Number(parsed.port) || envConfig.port,
    database: parsed.database ?? envConfig.database,
    user: parsed.user ?? envConfig.user,
    password: parsed.password ?? envConfig.password,
    ssl: resolveSsl(parsed.ssl ?? envConfig.ssl),
  };
}

export { getDbConfig };
