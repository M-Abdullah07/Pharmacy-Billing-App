const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Recommended for security
      contextIsolation: true, // Recommended for security
      nodeIntegration: false, // Recommended for security
    },
  });

  mainWindow.loadFile('index.html');

  // Initialize SQLite database
  db = new sqlite3.Database('./your_database.db', (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
    } else {
      console.log('Connected to SQLite database.');
      // Example: Create a table if it doesn't exist
      db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
    }
  });

   mainWindow.loadURL('http://localhost:5173'); // or loadFile in prod

  // 👇 This line opens DevTools when app launches
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

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
