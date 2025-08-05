const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

let db;

// Create DB and all required tables
function initializeDatabase() {
  db = new sqlite3.Database("pharmacy.db", (err) => {
    if (err) return console.error("❌ DB Connection Error:", err.message);
    console.log("✅ Connected to SQLite database.");
  });

  db.serialize(() => {
    // Medicines
    db.run(`CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Batches
    db.run(`CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL,
      expiry_date DATE NOT NULL,
      purchase_rate REAL NOT NULL,
      sale_rate REAL NOT NULL,
      quantity_available INTEGER NOT NULL,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    )`);



  // Recreate customers table with foreign key to Area(id)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      last_sale_rate_per_medicine TEXT,
      credit_amount REAL DEFAULT 0,
      area_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES Area(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);

    // Sales
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      is_credit BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )`);

    // Sale Items
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )`);

    // Credit Reminders
    db.run(`CREATE TABLE IF NOT EXISTS credit_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )`);

    // Settings
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      value TEXT
    )`);

  // Create the new companies table
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      contact TEXT,
      ntn TEXT,
      contact_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Area (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`Drop TABLE IF EXISTS medicines`);

    // PRODUCTS TABLE
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    form TEXT,
    uom TEXT,
    quantity_in_uom INTEGER DEFAULT 1,
    is_addictive INTEGER DEFAULT 0 CHECK (is_addictive IN (0, 1)),
    is_imported INTEGER DEFAULT 0 CHECK (is_imported IN (0, 1)),
    retail_price REAL DEFAULT 0.0,
    shelf_no TEXT,
    hold_sale INTEGER DEFAULT 0 CHECK (hold_sale IN (0, 1)),
    withheld_price REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);


  });
}


// Helper to run SQL with Promise
function runSql(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}


// IPC handlers
ipcMain.handle('query-db', async (event, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('run-db', async (event, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
});



ipcMain.handle("add-medicine", async (event, medicine) => {
  try {
    const { name, type } = medicine;
    const result = await runSql(
      "INSERT INTO medicines (name, type) VALUES (?, ?)",
      [name, type || ""]
    );
    return { success: true, medicineId: result.lastID };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("add-batch", async (event, batch) => {
  try {
    const { medicineId, batch_no, purchase_rate, quantity, expiry_date } = batch;
    const result = await runSql(
      `INSERT INTO batches (medicine_id, batch_number, purchase_rate, quantity_available, expiry_date)
       VALUES (?, ?, ?, ?, ?)`,
      [medicineId, batch_no, purchase_rate, quantity, expiry_date]
    );
    return { success: true, batchId: result.lastID };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('login-user', (event, username, password) => {
  try {
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? AND password = ?
    `).get(username, password);

    if (user) {
      return { success: true, userId: user.id };
    } else {
      return { success: false, error: 'Invalid credentials' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC handler to insert new area
ipcMain.handle('add-area', async (event, areaName) => {
  return new Promise((resolve) => {
    db.run('INSERT INTO Area (name) VALUES (?)', [areaName], function (err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

// Get all areas (for the dropdown)
ipcMain.handle('get-areas', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT id, name FROM Area ORDER BY name`, (err, rows) => {
      if (err) resolve([]);
      else resolve(rows);
    });
  });
});

// Get all customers with area name
ipcMain.handle('get-customers', async () => {
  return new Promise((resolve) => {
    db.all(`
      SELECT customers.*, Area.name as area_name
      FROM customers
      LEFT JOIN Area ON customers.area_id = Area.id
      ORDER BY customers.created_at DESC
    `, (err, rows) => {
      if (err) resolve([]);
      else resolve(rows);
    });
  });
});

// Add a new customer with area_id
ipcMain.handle("add-customer", async (event, customer) => {
  try {
    const { name, phone, whatsapp, area_id } = customer;
    const result = await runSql(
      `INSERT INTO customers (name, phone, whatsapp, area_id) VALUES (?, ?, ?, ?)`,
      [name, phone || '', whatsapp || '', area_id || null]
    );
    return { success: true, customerId: result.lastID };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("update-customer", async (event, id, updatedData) => {
  try {
    const { name, phone, whatsapp, area_id } = updatedData;
    const stmt = `
      UPDATE customers
      SET name = ?, phone = ?, whatsapp = ?, area_id = ?
      WHERE id = ?
    `;
    await runSql(stmt, [name, phone || '', whatsapp || '', area_id || null, id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-customer", async (event, id) => {
  try {
    await runSql(`DELETE FROM customers WHERE id = ?`, [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-companies', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM companies ORDER BY created_at DESC`, (err, rows) => {
      if (err) {
        console.error('❌ Error fetching companies:', err);
        resolve([]); // Always resolve to avoid hanging
      } else {
        //console.log('✅ Companies fetched:', rows);
        resolve(rows);
      }
    });
  });
});



ipcMain.handle('add-company', (event, query, values) => {
  try {
    const stmt = db.prepare(query);
    stmt.run(values);
    return { success: true };
  } catch (error) {
    console.error('Error adding company:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-products', async () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM products ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching products:", err.message);
        return resolve([]);
      }
      resolve(rows);
    });
  });
});

ipcMain.handle('add-product', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO products (
        name, form, uom, quantity_in_uom,
        is_addictive, is_imported, retail_price,
        withheld_price, shelf_no, hold_sale
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.name,
      data.form || '',
      data.uom || '',
      data.quantity_in_uom || 0,
      data.is_addictive ? 1 : 0,
      data.is_imported ? 1 : 0,
      data.retail_price || 0,
      data.withheld_price || 0,
      data.shelf_no || '',
      data.hold_sale ? 1 : 0
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


ipcMain.handle('getProducts', () => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    return products;
  } catch (err) {
    return { error: err.message };
  }
});

// Create the Electron window
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  const isDev = process.argv.some(arg => arg.includes('--no-sandbox') || arg.includes('--inspect') || arg.includes('electron'));

  if (isDev) {
    // Load from Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Optional for debugging
  } else {
    // Load production build
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// App lifecycle
app.whenReady().then(() => {
  initializeDatabase();
  //setTimeout(insertDemoData, 500); // Delay slightly to ensure tables are created
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    db.close();
    app.quit();
  }
});
