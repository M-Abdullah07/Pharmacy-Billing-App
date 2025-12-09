const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require('fs');

let db;

// Create DB and all required tables
function initializeDatabase() {
  db = new sqlite3.Database("pharmacy.db", (err) => {
    if (err) return console.error("❌ DB Connection Error:", err.message);
    console.log("✅ Connected to SQLite database.");
  });

  db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON");

    // 1. USERS TABLE - Authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. AREAS TABLE - Geographic areas (lowercase for consistency)
    db.run(`CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. COMPANIES TABLE - Suppliers/Manufacturers
    db.run(`CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      contact TEXT,
      ntn TEXT,
      contact_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. CUSTOMERS TABLE - Customer database
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      credit_amount REAL DEFAULT 0,
      area_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`);

    // 5. PRODUCTS TABLE - Product catalog (no medicines table!)
    db.run(`CREATE TABLE IF NOT EXISTS products (
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

    // 6. BATCHES TABLE - Inventory batches (uses product_id, not medicine_id!)
    db.run(`CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL,
      expiry_date DATE NOT NULL,
      purchase_rate REAL NOT NULL,
      sale_rate REAL NOT NULL,
      quantity_available INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, batch_number)
    )`);

    // 7. PURCHASES TABLE - Purchase orders
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL,
      po_date DATE,
      status TEXT DEFAULT 'received',
      total_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
    )`);

    // 8. SALES TABLE - Sales transactions
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      is_credit INTEGER DEFAULT 0 CHECK (is_credit IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )`);

    // 9. SALE_ITEMS TABLE - Sale line items
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
    )`);

    // 10. CREDIT_PAYMENTS TABLE - Credit payment records
    db.run(`CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`);

    // 11. EXPENSES TABLE - Business expenses
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 12. SALESMEN TABLE - Salesman records
    db.run(`CREATE TABLE IF NOT EXISTS salesmen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      cnic TEXT,
      address TEXT,
      commission_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 13. SETTINGS TABLE - Application settings
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    )`);

    // 14. CREDIT_REMINDERS TABLE - Payment reminders
    db.run(`CREATE TABLE IF NOT EXISTS credit_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`);

    console.log("✅ All database tables created successfully.");
  });
}

// ==================== PURCHASE & BATCH HANDLERS ====================

// Add a new purchase with batches
ipcMain.handle('add-purchase', async (event, purchaseData) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        db.run(`
          INSERT INTO purchases (company_id, invoice_no, po_date, status, total_amount)
          VALUES (?, ?, ?, ?, ?)
        `, [
          purchaseData.company_id,
          purchaseData.invoice_no,
          purchaseData.po_date || null,
          purchaseData.status || 'received',
          purchaseData.total_amount || 0
        ], function (err) {
          if (err) throw err;

          const purchaseId = this.lastID;

          if (purchaseData.batches && purchaseData.batches.length > 0) {
            const batchStmt = db.prepare(`
              INSERT INTO batches (product_id, batch_number, expiry_date, purchase_rate, sale_rate, quantity_available)
              VALUES (?, ?, ?, ?, ?, ?)
            `);

            purchaseData.batches.forEach(batch => {
              batchStmt.run(
                batch.product_id,
                batch.batch_no,
                batch.expiry_date,
                batch.purchase_rate,
                batch.sale_rate,
                batch.quantity
              );
            });

            batchStmt.finalize();
          }

          db.run('COMMIT');
          resolve({ success: true, purchaseId });
        });
      } catch (error) {
        db.run('ROLLBACK');
        console.error('Error adding purchase:', error);
        resolve({ success: false, error: error.message });
      }
    });
  });
});

// Get all purchases
ipcMain.handle('get-purchases', async () => {
  return new Promise((resolve) => {
    db.all(`
      SELECT p.*, c.name as company_name
      FROM purchases p
      LEFT JOIN companies c ON p.company_id = c.id
      ORDER BY p.created_at DESC
    `, (err, rows) => {
      if (err) {
        console.error('Error fetching purchases:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// Get batches for a product
ipcMain.handle('get-batches-by-product', async (event, productId) => {
  return new Promise((resolve) => {
    db.all(`
      SELECT * FROM batches 
      WHERE product_id = ? AND quantity_available > 0
      ORDER BY expiry_date ASC
    `, [productId], (err, rows) => {
      if (err) {
        console.error('Error fetching batches:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// ==================== SALES HANDLERS ====================

// Add sale with stock reduction
ipcMain.handle('add-sale-transaction', async (event, saleData) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        db.run(`
          INSERT INTO sales (customer_id, total_amount, is_credit, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `, [
          saleData.customer_id,
          saleData.total_amount,
          saleData.is_credit ? 1 : 0
        ], function (err) {
          if (err) throw err;

          const saleId = this.lastID;

          const saleItemStmt = db.prepare(`
            INSERT INTO sale_items (sale_id, batch_id, quantity, rate, amount)
            VALUES (?, ?, ?, ?, ?)
          `);

          saleData.items.forEach(item => {
            saleItemStmt.run(saleId, item.batch_id, item.quantity, item.rate, item.amount);

            db.run(`
              UPDATE batches SET quantity_available = quantity_available - ?
              WHERE id = ?
            `, [item.quantity, item.batch_id]);
          });

          saleItemStmt.finalize();

          if (saleData.is_credit) {
            db.run(`
              UPDATE customers 
              SET credit_amount = COALESCE(credit_amount, 0) + ?
              WHERE id = ?
            `, [saleData.total_amount, saleData.customer_id]);
          }

          db.run('COMMIT');
          resolve({ success: true, saleId });
        });
      } catch (error) {
        db.run('ROLLBACK');
        console.error('Error adding sale:', error);
        resolve({ success: false, error: error.message });
      }
    });
  });
});

// Get sales with filters
ipcMain.handle('get-sales', async (event, filters = {}) => {
  return new Promise((resolve) => {
    let query = `
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.start_date) {
      query += ` AND DATE(s.created_at) >= ?`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND DATE(s.created_at) <= ?`;
      params.push(filters.end_date);
    }

    if (filters.customer_id) {
      query += ` AND s.customer_id = ?`;
      params.push(filters.customer_id);
    }

    if (filters.is_credit !== undefined) {
      query += ` AND s.is_credit = ?`;
      params.push(filters.is_credit ? 1 : 0);
    }

    query += ` ORDER BY s.created_at DESC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching sales:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// Get sale details with items
ipcMain.handle('get-sale-details', async (event, saleId) => {
  return new Promise((resolve) => {
    db.all(`
      SELECT si.*, p.name as product_name, b.batch_number
      FROM sale_items si
      LEFT JOIN batches b ON si.batch_id = b.id
      LEFT JOIN products p ON b.product_id = p.id
      WHERE si.sale_id = ?
    `, [saleId], (err, rows) => {
      if (err) {
        console.error('Error fetching sale details:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// ==================== CREDIT PAYMENT HANDLERS ====================

// Record credit payment
ipcMain.handle('add-credit-payment', async (event, paymentData) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        db.run(`
          INSERT INTO credit_payments (customer_id, amount, payment_date, notes)
          VALUES (?, ?, ?, ?)
        `, [
          paymentData.customer_id,
          paymentData.amount,
          paymentData.payment_date,
          paymentData.notes || ''
        ], function (err) {
          if (err) throw err;

          db.run(`
            UPDATE customers 
            SET credit_amount = credit_amount - ?
            WHERE id = ?
          `, [paymentData.amount, paymentData.customer_id]);

          db.run('COMMIT');
          resolve({ success: true });
        });
      } catch (error) {
        db.run('ROLLBACK');
        console.error('Error recording payment:', error);
        resolve({ success: false, error: error.message });
      }
    });
  });
});

// Get credit payments for a customer
ipcMain.handle('get-credit-payments', async (event, customerId) => {
  return new Promise((resolve) => {
    const query = customerId
      ? `SELECT * FROM credit_payments WHERE customer_id = ? ORDER BY payment_date DESC`
      : `SELECT cp.*, c.name as customer_name 
         FROM credit_payments cp
         LEFT JOIN customers c ON cp.customer_id = c.id
         ORDER BY cp.payment_date DESC`;

    const params = customerId ? [customerId] : [];

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching payments:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// Get customers with credit dues
ipcMain.handle('get-customers-with-dues', async () => {
  return new Promise((resolve) => {
    db.all(`
      SELECT c.*, a.name as area_name
      FROM customers c
      LEFT JOIN Area a ON c.area_id = a.id
      WHERE c.credit_amount > 0
      ORDER BY c.credit_amount DESC
    `, (err, rows) => {
      if (err) {
        console.error('Error fetching customers with dues:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// ==================== EXPENSE HANDLERS ====================

// Add expense
ipcMain.handle('add-expense', async (event, expenseData) => {
  return new Promise((resolve) => {
    db.run(`
      INSERT INTO expenses (category, amount, description, expense_date)
      VALUES (?, ?, ?, ?)
    `, [
      expenseData.category,
      expenseData.amount,
      expenseData.description || '',
      expenseData.expense_date
    ], function (err) {
      if (err) {
        console.error('Error adding expense:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, expenseId: this.lastID });
      }
    });
  });
});

// Get expenses
ipcMain.handle('get-expenses', async (event, filters = {}) => {
  return new Promise((resolve) => {
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (filters.start_date) {
      query += ` AND expense_date >= ?`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND expense_date <= ?`;
      params.push(filters.end_date);
    }

    if (filters.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }

    query += ` ORDER BY expense_date DESC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching expenses:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// ==================== SALESMEN HANDLERS ====================

// Get all salesmen
ipcMain.handle('get-salesmen', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM salesmen ORDER BY created_at DESC`, (err, rows) => {
      if (err) {
        console.error('Error fetching salesmen:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// Add salesman
ipcMain.handle('add-salesman', async (event, salesmanData) => {
  return new Promise((resolve) => {
    db.run(`
      INSERT INTO salesmen (name, phone, cnic, address, commission_rate)
      VALUES (?, ?, ?, ?, ?)
    `, [
      salesmanData.name,
      salesmanData.phone || '',
      salesmanData.cnic || '',
      salesmanData.address || '',
      salesmanData.commission_rate || 0
    ], function (err) {
      if (err) {
        console.error('Error adding salesman:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, salesmanId: this.lastID });
      }
    });
  });
});

// Update salesman
ipcMain.handle('update-salesman', async (event, id, salesmanData) => {
  return new Promise((resolve) => {
    db.run(`
      UPDATE salesmen 
      SET name = ?, phone = ?, cnic = ?, address = ?, commission_rate = ?
      WHERE id = ?
    `, [
      salesmanData.name,
      salesmanData.phone || '',
      salesmanData.cnic || '',
      salesmanData.address || '',
      salesmanData.commission_rate || 0,
      id
    ], function (err) {
      if (err) {
        console.error('Error updating salesman:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

// Delete salesman
ipcMain.handle('delete-salesman', async (event, id) => {
  return new Promise((resolve) => {
    db.run('DELETE FROM salesmen WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Error deleting salesman:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

// ==================== EXPENSE HANDLERS ====================

// Update expense
ipcMain.handle('update-expense', async (event, id, expenseData) => {
  return new Promise((resolve) => {
    db.run(`
      UPDATE expenses 
      SET category = ?, amount = ?, description = ?, expense_date = ?
      WHERE id = ?
    `, [
      expenseData.category,
      expenseData.amount,
      expenseData.description || '',
      expenseData.expense_date,
      id
    ], function (err) {
      if (err) {
        console.error('Error updating expense:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});

// Delete expense
ipcMain.handle('delete-expense', async (event, id) => {
  return new Promise((resolve) => {
    db.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Error deleting expense:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
});


// ==================== REPORTS & ANALYTICS ====================

// Get sales summary
ipcMain.handle('get-sales-summary', async (event, filters = {}) => {
  return new Promise((resolve) => {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_sales,
        SUM(CASE WHEN is_credit = 1 THEN total_amount ELSE 0 END) as credit_sales,
        SUM(CASE WHEN is_credit = 0 THEN total_amount ELSE 0 END) as cash_sales
      FROM sales
      WHERE 1=1
    `;

    const params = [];

    if (filters.start_date) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(filters.end_date);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Error fetching sales summary:', err);
        resolve({});
      } else {
        resolve(row || {});
      }
    });
  });
});

// Get daily sales for chart
ipcMain.handle('get-daily-sales', async (event, filters = {}) => {
  return new Promise((resolve) => {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(total_amount) as total
      FROM sales
      WHERE 1=1
    `;

    const params = [];

    if (filters.start_date) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(filters.end_date);
    }

    query += ` GROUP BY DATE(created_at) ORDER BY date ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching daily sales:', err);
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
});

// ==================== BACKUP & EXPORT ====================

// Backup database
ipcMain.handle('backup-database', async () => {
  return new Promise(async (resolve) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: `pharmacy-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'Database', extensions: ['db'] }]
      });

      if (!result.canceled && result.filePath) {
        fs.copyFileSync('pharmacy.db', result.filePath);
        resolve({ success: true, path: result.filePath });
      } else {
        resolve({ success: false, error: 'Backup cancelled' });
      }
    } catch (error) {
      console.error('Error backing up database:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

// Export to CSV
ipcMain.handle('export-to-csv', async (event, { table, filename }) => {
  return new Promise(async (resolve) => {
    try {
      const rows = await new Promise((res, rej) => {
        db.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) rej(err);
          else res(rows);
        });
      });

      if (rows.length === 0) {
        resolve({ success: false, error: 'No data to export' });
        return;
      }

      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(row =>
        Object.values(row).map(val => `"${val}"`).join(',')
      );
      const csv = [headers, ...csvRows].join('\n');

      const result = await dialog.showSaveDialog({
        title: 'Export to CSV',
        defaultPath: filename || `${table}-export.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      });

      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, csv);
        resolve({ success: true, path: result.filePath });
      } else {
        resolve({ success: false, error: 'Export cancelled' });
      }
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      resolve({ success: false, error: error.message });
    }
  });
});



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
      `INSERT INTO batches (product_id, batch_number, purchase_rate, quantity_available, expiry_date)
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
    db.run('INSERT INTO areas (name) VALUES (?)', [areaName], function (err) {
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
    db.all(`SELECT id, name FROM areas ORDER BY name`, (err, rows) => {
      if (err) resolve([]);
      else resolve(rows);
    });
  });
});

// Get all customers with area name
ipcMain.handle('get-customers', async () => {
  return new Promise((resolve) => {
    db.all(`
      SELECT customers.*, areas.name as area_name
      FROM customers
      LEFT JOIN areas ON customers.area_id = areas.id
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
