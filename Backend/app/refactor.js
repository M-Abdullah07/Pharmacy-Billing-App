const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
const servicesDir = path.join(__dirname, 'services');

if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir);
}

const content = fs.readFileSync(mainJsPath, 'utf8');

const handlerRegex = /ipcMain\.handle\("([^"]+)"[\s\S]*?\n\}\);/g;

const groups = {
  authService: ['login-user', 'signup-user'],
  productService: ['get-categories', 'get-products', 'get-all-products', 'getProducts', 'add-product', 'update-product', 'deactivate-product', 'reactivate-product', 'reactivate-manufacturer'],
  partyService: ['get-suppliers', 'get-suppliers-with-contact', 'add-supplier', 'update-supplier', 'deactivate-supplier', 'reactivate-supplier', 'get-companies', 'add-company', 'get-customers', 'get-customers-with-contact', 'add-customer', 'update-customer', 'delete-customer', 'reactivate-customer', 'add-contact-person', 'get-contact-persons', 'delete-contact-person'],
  stockService: ['get-batches', 'add-batch', 'get-batches-by-product', 'get-stock-summary', 'get-stock-by-product', 'get-near-expiry'],
  purchaseService: ['get-purchase-invoices', 'get-purchase-invoice', 'add-purchase-invoice', 'add-purchase-invoice-item', 'confirm-purchase-invoice', 'cancel-purchase-invoice', 'get-purchase-return-items', 'get-purchase-returns', 'add-purchase-return'],
  saleService: ['add-sale', 'get-sales', 'get-sale-details'],
  ledgerService: ['get-outstanding-payables', 'get-supplier-ledger'],
  systemService: ['get-dashboard-stats', 'get-near-expiry-stats', 'get-analytics-chart-data', 'get-activity-list', 'backup-database', 'export-to-csv', 'query-db', 'select-directory']
};

const fileContents = {};

let match;
while ((match = handlerRegex.exec(content)) !== null) {
  const handlerName = match[1];
  const handlerBody = match[0];
  
  let targetFile = 'systemService.js'; // fallback
  for (const [file, names] of Object.entries(groups)) {
    if (names.includes(handlerName)) {
      targetFile = file + '.js';
      break;
    }
  }

  if (!fileContents[targetFile]) {
    fileContents[targetFile] = [];
  }
  fileContents[targetFile].push(handlerBody);
}

const dbContent = 'import pg from "pg";\n' +
'const { Pool } = pg;\n\n' +
'const pool = process.env.DATABASE_URL\n' +
'  ? new Pool({ connectionString: process.env.DATABASE_URL })\n' +
'  : new Pool({\n' +
'    host: process.env.DB_HOST || "127.0.0.1",\n' +
'    port: process.env.DB_PORT || 5432,\n' +
'    database: process.env.DB_NAME || "Pharmax",\n' +
'    user: process.env.DB_USER || "postgres",\n' +
'    password: process.env.DB_PASSWORD || "",\n' +
'  });\n\n' +
'pool.on("error", (err) => {\n' +
'  console.error("❌ Unexpected PostgreSQL pool error:", err.message);\n' +
'});\n\n' +
'async function testConnection() {\n' +
'  try {\n' +
'    const res = await pool.query("SELECT NOW() AS now");\n' +
'    console.log("✅ PostgreSQL connected at:", res.rows[0].now);\n\n' +
'    const tables = ["users", "products", "categories",\n' +
'      "suppliers", "customers", "batches", "stock_movements", "settings"];\n\n' +
'    await pool.query(\n' +
'      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())"\n' +
'    );\n\n' +
'    for (const t of tables) {\n' +
'      const check = await pool.query("SELECT to_regclass(\'public." + t + "\') AS tbl");\n' +
'      const exists = check.rows[0].tbl !== null;\n' +
'      console.log("  " + (exists ? "✅" : "❌") + " Table: " + t);\n' +
'    }\n' +
'  } catch (err) {\n' +
'    console.error("❌ PostgreSQL connection failed:", err.message);\n' +
'  }\n' +
'}\n\n' +
'async function queryDb(sql, params = []) {\n' +
'  const result = await pool.query(sql, params);\n' +
'  return result.rows;\n' +
'}\n\n' +
'async function runDb(sql, params = []) {\n' +
'  const result = await pool.query(sql, params);\n' +
'  return {\n' +
'    rowCount: result.rowCount,\n' +
'    lastID: result.rows[0]?.id ?? result.rows[0]?.user_id\n' +
'      ?? result.rows[0]?.product_id ?? result.rows[0]?.customer_id\n' +
'      ?? result.rows[0]?.supplier_id\n' +
'      ?? result.rows[0]?.batch_id ?? null,\n' +
'    row: result.rows[0] ?? null,\n' +
'  };\n' +
'}\n\n' +
'export { pool, queryDb, runDb, testConnection };\n';
fs.writeFileSync(path.join(servicesDir, 'db.js'), dbContent);

const importsMap = [];

for (const [filename, bodies] of Object.entries(fileContents)) {
  let imports = '';
  if (filename === 'authService.js') imports += 'import * as argon2 from "argon2";\n';
  if (filename === 'saleService.js') {
    imports += 'import path from "path";\n';
    imports += 'import { fileURLToPath } from "url";\n';
    imports += 'const __dirname = path.dirname(fileURLToPath(import.meta.url));\n';
    imports += 'import { calculateFefoPlan } from "../utils/fefoAllocator.js";\n';
  }
  if (filename === 'systemService.js') {
    imports += 'import { dialog, app } from "electron";\n';
    imports += 'import fs from "fs";\n';
    imports += 'import path from "path";\n';
  }

  const fileStr = imports + '\n' +
    'export default function register(ipcMain, db) {\n' +
    '  const { queryDb, runDb, pool } = db;\n\n' +
    bodies.map(b => b.split('\n').map(l => '  ' + l).join('\n')).join('\n\n') + '\n' +
    '}\n';
  
  fs.writeFileSync(path.join(servicesDir, filename), fileStr);
  
  const functionName = filename.replace('.js', '');
  importsMap.push({ file: filename, name: functionName });
}

let importsString = importsMap.map(m => 'import ' + m.name + ' from "./services/' + m.file + '";').join('\n');
let callsString = importsMap.map(m => '  ' + m.name + '(ipcMain, db);').join('\n');

const newMainContent = 'import { app, BrowserWindow, ipcMain, dialog } from "electron";\n' +
'import path from "path";\n' +
'import dotenv from "dotenv";\n' +
'import { fileURLToPath } from "url";\n\n' +
'const __filename = fileURLToPath(import.meta.url);\n' +
'const __dirname = path.dirname(__filename);\n\n' +
'dotenv.config({\n' +
'  path: path.join(__dirname, "..", "..", "..", "Backend", "app", ".env")\n' +
'});\n\n' +
'import { pool, queryDb, runDb, testConnection } from "./services/db.js";\n\n' +
importsString + '\n\n' +
'// ─── App Initialization ────────────────────────────────────────────────────────\n\n' +
'app.whenReady().then(() => {\n' +
'  console.log("🚀 Electron app is ready");\n  \n' +
'  testConnection();\n\n' +
'  const db = { queryDb, runDb, pool };\n' +
callsString + '\n\n' +
'  const mainWindow = new BrowserWindow({\n' +
'    width: 1200,\n' +
'    height: 800,\n' +
'    webPreferences: {\n' +
'      preload: path.join(__dirname, "preload.js"),\n' +
'      contextIsolation: true,\n' +
'      nodeIntegration: false,\n' +
'    },\n' +
'  });\n\n' +
'  if (process.env.VITE_DEV_SERVER_URL) {\n' +
'    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);\n' +
'  } else {\n' +
'    mainWindow.loadFile(path.join(__dirname, "..", "..", "Frontend", "dist", "index.html"));\n' +
'  }\n' +
'});\n\n' +
'app.on("window-all-closed", () => {\n' +
'  if (process.platform !== "darwin") app.quit();\n' +
'});\n';

fs.writeFileSync(mainJsPath, newMainContent);
console.log('Successfully refactored main.js into ESM services');
