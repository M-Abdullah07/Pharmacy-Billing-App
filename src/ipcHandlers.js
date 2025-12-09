const { ipcMain, dialog } = require('electron');
const fs = require('fs');

// This module exports a function that registers all IPC handlers
module.exports = function registerIPCHandlers(db) {

    // ==================== PURCHASE & BATCH HANDLERS ====================

    // Add a new purchase with batches
    ipcMain.handle('add-purchase', async (event, purchaseData) => {
        return new Promise((resolve) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                try {
                    // Insert purchase record
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

                        // Insert batches for this purchase
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
                    // Insert sale record
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

                        // Insert sale items and reduce stock
                        const saleItemStmt = db.prepare(`
              INSERT INTO sale_items (sale_id, batch_id, quantity, rate, amount)
              VALUES (?, ?, ?, ?, ?)
            `);

                        saleData.items.forEach(item => {
                            saleItemStmt.run(saleId, item.batch_id, item.quantity, item.rate, item.amount);

                            // Reduce stock
                            db.run(`
                UPDATE batches SET quantity_available = quantity_available - ?
                WHERE id = ?
              `, [item.quantity, item.batch_id]);
                        });

                        saleItemStmt.finalize();

                        // Update customer credit if credit sale
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
                    // Insert payment record
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

                        // Reduce customer credit
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

                // Convert to CSV
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

};
