const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5173'); // dev mode

  // Uncomment this in production
  // mainWindow.loadFile('index.html');

  mainWindow.webContents.openDevTools();
}

// SQLite Schema Setup
function setupDatabase() {
  db = new sqlite3.Database('./pharmacy.db', (err) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.message);
    } else {
      console.log('✅ Connected to SQLite database.');

      const schema = [
        // 1. Medicines
        `CREATE TABLE IF NOT EXISTS medicines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          company TEXT,
          low_stock_threshold INTEGER DEFAULT 0
        );`,

        // 2. Batches
        `CREATE TABLE IF NOT EXISTS batches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medicine_id INTEGER NOT NULL,
          batch_number TEXT,
          expiry_date TEXT,
          purchase_rate REAL NOT NULL,
          quantity INTEGER NOT NULL,
          FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        );`,

        // 3. Customers
        `CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          credit_due REAL DEFAULT 0,
          last_reminder_sent TEXT,
          reminder_date TEXT
        );`,

        // 4. Sales
        `CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          sale_date TEXT DEFAULT (datetime('now')),
          total_amount REAL NOT NULL,
          is_credit BOOLEAN DEFAULT 0,
          invoice_pdf_path TEXT,
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        );`,

        // 5. Sale Items
        `CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          batch_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          sale_rate REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (batch_id) REFERENCES batches(id)
        );`,

        // 6. Last Sale Rates (per customer per medicine)
        `CREATE TABLE IF NOT EXISTS last_rates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          medicine_id INTEGER NOT NULL,
          last_sale_rate REAL NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (medicine_id) REFERENCES medicines(id),
          UNIQUE (customer_id, medicine_id)
        );`
      ];

      // Run schema creation sequentially
      db.serialize(() => {
        for (const query of schema) {
          db.run(query, (err) => {
            if (err) console.error('Schema Error:', err.message);
          });
        }
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setupDatabase();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handler to run DB queries from Renderer
ipcMain.handle('db-query', async (event, query, params = []) => {
  return new Promise((resolve, reject) => {
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(query)) {
      db.run(query, params, function (err) {
        if (err) reject(err.message);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    } else {
      db.all(query, params, (err, rows) => {
        if (err) reject(err.message);
        else resolve(rows);
      });
    }
  });
});
