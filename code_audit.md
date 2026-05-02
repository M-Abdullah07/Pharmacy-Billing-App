# Pharmax Code Quality Audit

## At a Glance

| Metric | Current | Concern |
|---|---|---|
| `main.js` size | **59 KB / ~1,580 lines** | God file — every handler in one place |
| IPC handlers in `main.js` | **48** | All 48 in a single file |
| `Products.jsx` size | **56 KB / ~1,214 lines** | God component |
| `Toast` component copies | **8** | Identical function duplicated across 8 files |
| Raw SQL in frontend | **11 callsites** | Frontend bypasses the IPC API layer entirely |
| Error boundary | **0** | One crash takes down the whole app |

---

## Issues by SOLID Principle

### S — Single Responsibility Principle

> [!CAUTION]
> **`main.js` does everything.** Auth, products, suppliers, batches, sales, purchase invoices, purchase returns, stock, backup, CSV export, settings — all 48 handlers live in one 1,580-line file. If you need to touch a sales bug, you're scrolling past auth and supplier code.

> [!CAUTION]
> **`Products.jsx` is a 1,214-line monolith.** It contains the product form, product table, stock summary view, batch side-panel, pagination, filtering, toast, and ALL CRUD logic. Same issue with `Companies.jsx` (33 KB) and `Purchaseinvoice.jsx` (42 KB).

**Recommendation:**
- **Backend:** Split `main.js` into domain modules:
  ```
  Backend/app/
  ├── main.js              (app shell, pool init, testConnection only)
  ├── handlers/
  │   ├── auth.js
  │   ├── products.js
  │   ├── suppliers.js
  │   ├── customers.js
  │   ├── batches.js
  │   ├── sales.js
  │   ├── purchases.js
  │   ├── stock.js
  │   └── backup.js
  └── db.js                (pool, queryDb, runDb helpers)
  ```
- **Frontend:** Extract sub-components from mega-pages:
  ```
  pages/Products/
  ├── index.jsx            (orchestrator)
  ├── ProductForm.jsx
  ├── ProductTable.jsx
  ├── StockView.jsx
  └── BatchSidePanel.jsx
  ```

---

### O — Open/Closed Principle

> [!WARNING]
> **Adding a new entity requires touching 4 files.** To add a new module (e.g. Purchase Orders), you must: edit `main.js` (add handlers), edit `preload.js` (add API bindings), create the page, edit `App.jsx` (add route), and edit `Sidebar.jsx` (add nav item). Nothing is plugin-based or registry-driven.

**Recommendation:** Create a handler registry pattern:
```js
// handlers/products.js
module.exports = function registerProductHandlers(ipcMain, db) {
  ipcMain.handle("get-products", async () => { ... });
  // ...
};

// main.js
const handlers = [require('./handlers/products'), require('./handlers/sales'), ...];
handlers.forEach(register => register(ipcMain, { queryDb, runDb, pool }));
```

---

### D — Dependency Inversion Principle

> [!CAUTION]
> **Frontend components call raw SQL directly via `window.electronAPI.queryDb()`.** 11 places in the frontend write SQL strings — `StatsPanel.jsx`, `NearExpiryPanel.jsx`, `AnalyticsChart.jsx`, `ActivityList.jsx`, `Products.jsx`, `Companies.jsx`, `AddCustomers.jsx`, and `PurchaseReturns.jsx`. This means:
> - The frontend **depends on the database schema** directly
> - If you rename a column, you need to fix SQL in React components
> - No abstraction layer between the UI and the database

**Recommendation:** Every data need should go through a named IPC handler in the backend:
```js
// Instead of frontend writing: queryDb("SELECT SUM(net_receivable) FROM sale_invoices...")
// Create: ipcMain.handle("get-dashboard-stats", ...) in the backend
// Frontend calls: window.electronAPI.getDashboardStats()
```

---

## Other Issues (Non-SOLID but Important)

### 1. Toast Component Duplicated 8 Times

The exact same `Toast` function is copy-pasted into:
`Products.jsx`, `Companies.jsx`, `AddCustomers.jsx`, `Backup.jsx`, `Settings.jsx`, `Purchaseinvoice.jsx`, `Login.jsx`, `Signup.jsx`

**Fix:** Extract to `components/shared/Toast.jsx` and import everywhere.

### 2. No Error Boundary

If any component throws during render, the entire app white-screens. There's no `ErrorBoundary` component.

**Fix:** Add a React Error Boundary wrapper around `renderPage()` in `App.jsx`.

### 3. No Loading/Error Pattern Abstraction

Every page re-implements the same `loading` / `error` / `data` state pattern with slight variations. There's no shared hook.

**Fix:** Create a `useAsyncData(fetchFn)` custom hook that returns `{ data, loading, error, refetch }`.

### 4. Inline SQL Comment in Schema Reference

The comment at line 232 of `main.js` still says `manufacturer_id FK` — stale after the migration:
```
// PRODUCTS  (schema: product_id UUID, name, manufacturer_id FK, ...
```
This should be updated to reflect that the FK now points to `suppliers`.

### 5. No Input Validation in Backend

Product, customer, and supplier handlers trust whatever the frontend sends. There's no server-side validation — the only protection is the DB constraints.

**Fix:** Add a simple validation layer (even just null/type checks) before hitting the DB.

---

## Priority Ranking

| # | Issue | Impact | Effort |
|---|---|---|---|
| 1 | **Raw SQL in frontend** (DIP violation) | High — schema coupling, security | Medium |
| 2 | **Extract Toast component** | Low risk, high code hygiene | Low |
| 3 | **Split `main.js` into handler modules** (SRP) | High — maintainability | Medium |
| 4 | **Split mega-components** (SRP) | Medium — dev velocity | Medium-High |
| 5 | **Add Error Boundary** | Medium — UX resilience | Low |
| 6 | **Handler registry pattern** (OCP) | Low — future flexibility | Low |
| 7 | **Backend input validation** | Medium — data integrity | Medium |
| 8 | **Custom `useAsyncData` hook** | Low — DRY | Low |

> [!IMPORTANT]
> Items 1–3 deliver the most value. The rest are polish. Would you like me to start implementing any of these?
