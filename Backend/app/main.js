import { app, BrowserWindow, ipcMain, dialog, session } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// M20: dotenv loading now happens inside Backend/app/config.js (via db.js's
// getPool() -> getDbConfig()), which try/catches the dotenv import itself so
// a missing .env under asar never crashes startup. The old hardcoded
// `dotenv.config({ path: path.join(__dirname, "..", "..", "..", "Backend", "app", ".env") })`
// here broke under asar (that relative path doesn't exist inside the
// packaged app) — removed in favor of the single resolution path in config.js.

import { pool, queryDb, runDb, testConnection } from "./services/db.js";

import authService from "./services/authService.js";
import productService from "./services/productService.js";
import partyService from "./services/partyService.js";
import stockService from "./services/stockService.js";
import purchaseService from "./services/purchaseService.js";
import saleService from "./services/saleService.js";
import ledgerService from "./services/ledgerService.js";
import systemService from "./services/systemService.js";
import { clearSession } from "./services/session.js";

// M21: log unhandled promise rejections instead of letting them vanish
// silently (or crash the process with no diagnostic trail).
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled promise rejection:", reason);
});

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

  // H3: clear this window's server-side session as soon as its webContents is
  // gone, so a stale session entry can't linger and be reused if a webContents
  // id were ever reissued.
  mainWindow.webContents.on("destroyed", () => {
    clearSession(mainWindow.webContents.id);
  });

  // ─── Ready to Show Logic ──────────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow.close();
      mainWindow.show();
      mainWindow.focus();
    }, 1000); // Small buffer to ensure rendering is smooth
  });

  // H5/M19: devtools + the dev-server branches are dev-only. Gating them
  // behind `!app.isPackaged` (rather than just "does a dev URL variable
  // exist") means a packaged build can never accidentally open devtools or
  // try to load a dev server, even if those globals were somehow defined.
  if (!app.isPackaged && typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // H5/M19: forge-vite's build output puts the renderer at
    // .vite/renderer/<name>/index.html relative to the project root, and
    // main.js itself is built to .vite/build/main.js — so from __dirname
    // (.vite/build) the renderer is at ../renderer/main_window/index.html.
    // The previous path (path.join(__dirname, "..", "..", "dist", "index.html"))
    // pointed at a "dist" directory this build never produces.
    const rendererPath = path.join(__dirname, "..", "renderer", "main_window", "index.html");
    if (fs.existsSync(rendererPath)) {
      mainWindow.loadFile(rendererPath);
    } else {
      dialog.showErrorBox(
        "PharmaX — Startup Error",
        `The application UI could not be found.\n\nExpected renderer at:\n${rendererPath}\n\n` +
        `This usually means the build is corrupted or incomplete. Please reinstall the application.`
      );
      app.quit();
    }
  }
}).catch((err) => {
  // M21: catch any error thrown/rejected anywhere in the whenReady().then(...)
  // chain above (e.g. a synchronous throw in one of the register() calls) so
  // it surfaces in the log instead of becoming a silent unhandled rejection.
  console.error("❌ Fatal error during app initialization:", err);
});

app.on("window-all-closed", async () => {
  console.log("🔴 window-all-closed fired");

  if (process.platform !== "darwin") {
    console.log("🔵 Platform is not darwin, proceeding...");

    try {
      // H5: the previous inline `require("electron")` here crashed under ESM
      // (require is not defined in an ES module). `session` is now imported
      // at the top of the file instead.
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
