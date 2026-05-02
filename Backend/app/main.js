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
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  }
});

app.on("window-all-closed", async () => {
  console.log("🔴 window-all-closed fired");

  if (process.platform !== "darwin") {
    console.log("🔵 Platform is not darwin, proceeding...");

    try {
      const { session } = require("electron");
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
  }
});
