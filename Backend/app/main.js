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
  
  // ─── Create Splash Window ──────────────────────────────────────────────────
  const splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #0f172a;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                overflow: hidden;
                -webkit-app-region: drag;
                border-radius: 12px;
            }
            .container { text-align: center; }
            .logo {
                font-size: 48px;
                font-weight: 800;
                margin-bottom: 20px;
                background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -1px;
            }
            .loader {
                width: 48px;
                height: 48px;
                border: 5px solid #1e293b;
                border-bottom-color: #38bdf8;
                border-radius: 50%;
                display: inline-block;
                animation: rotation 1s linear infinite;
            }
            .status {
                margin-top: 20px;
                font-size: 14px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            @keyframes rotation {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">PHARMAX</div>
            <div class="loader"></div>
            <div class="status">Initializing System...</div>
        </div>
    </body>
    </html>
  `;
  
  splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(splashHtml)}`);

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

  // ─── Create Main Window (Hidden) ───────────────────────────────────────────
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ─── Ready to Show Logic ──────────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow.close();
      mainWindow.show();
      mainWindow.focus();
    }, 1000); // Small buffer to ensure rendering is smooth
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
