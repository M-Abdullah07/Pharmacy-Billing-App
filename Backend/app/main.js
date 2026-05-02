import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "..", "..", "..", "Backend", "app", ".env")
});

import { pool, queryDb, runDb, testConnection } from "./services/db.js";

import authService from "./services/authService.js";
import productService from "./services/productService.js";
import partyService from "./services/partyService.js";
import stockService from "./services/stockService.js";
import purchaseService from "./services/purchaseService.js";
import saleService from "./services/saleService.js";
import ledgerService from "./services/ledgerService.js";
import systemService from "./services/systemService.js";

// ─── App Initialization ────────────────────────────────────────────────────────

app.whenReady().then(() => {
  console.log("🚀 Electron app is ready");
  
  testConnection();

  const db = { queryDb, runDb, pool };
  authService(ipcMain, db);
  productService(ipcMain, db);
  partyService(ipcMain, db);
  stockService(ipcMain, db);
  purchaseService(ipcMain, db);
  saleService(ipcMain, db);
  ledgerService(ipcMain, db);
  systemService(ipcMain, db);

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
