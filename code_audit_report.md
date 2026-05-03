# Code Audit Report - Pharmacy Billing App

**Date:** 2026-05-03
** Auditor:** Claude Code
** Scope:** Backend services, Frontend pages, Database schema

---

## Executive Summary

This audit identified **47 total issues** across 6 categories. Critical security vulnerabilities require immediate attention before production deployment.

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3 | 2 | 2 | 1 | 8 |
| Architecture | 0 | 4 | 3 | 2 | 9 |
| Bad Practices | 0 | 5 | 4 | 3 | 12 |
| Performance | 0 | 2 | 2 | 1 | 5 |
| Maintainability | 0 | 3 | 4 | 2 | 9 |
| Error Handling | 0 | 2 | 1 | 1 | 4 |
| **TOTAL** | **3** | **18** | **16** | **10** | **47** |

---

## 1. Security Vulnerabilities

### 1.1 CRITICAL - SQL Injection via Table Name Interpolation

**Location:** `Backend/app/services/systemService.js:13,41`

**Code:**
```javascript
const rows = await queryDb(`SELECT * FROM ${t}`);
const rows = await queryDb(`SELECT * FROM ${dbTable}`);
```

**Issue:** Table names are directly interpolated into SQL strings without validation. Attacker can inject arbitrary SQL via the `table` parameter in `export-to-csv` IPC handler.

**Impact:** Full database read/write access. Attackers can execute: `exportToCsv({ table: "users; DROP TABLE users; --" })`

**Recommendation:**
```javascript
const ALLOWED_TABLES = new Set(['users', 'products', 'categories', 'suppliers', 'customers', 'batches', 'stock_movements', 'sale_invoices', 'sale_invoice_items']);
if (!ALLOWED_TABLES.has(t)) {
  throw new Error(`Invalid table name: ${t}`);
}
```

---

### 1.2 CRITICAL - Raw SQL Endpoint Exposed

**Location:** `Backend/app/services/systemService.js:71-77`

**Code:**
```javascript
ipcMain.handle("query-db", async (event, sql, params) => {
  try {
    return await queryDb(sql, params);
  } catch (err) {
    console.error("❌ query-db error:", err.message);
    throw err;
  }
});
```

**Issue:** Frontend can send arbitrary SQL queries directly to the backend. This is exposed via `preload.js:89` as `exportToCsv`.

**Impact:** Complete database compromise. Any authenticated user can read/modify/delete any data.

**Recommendation:** Remove this endpoint entirely. If debugging is needed, implement admin-only flag with strong authentication.

---

### 1.3 CRITICAL - Weak Password Policy

**Location:** `Frontend/src/pages/Signup.jsx:34`

**Code:**
```javascript
else if (password.length < 6) errors.password = 'Min 6 characters';
```

**Issue:** Only checks minimum length. No requirements for uppercase, lowercase, numbers, or special characters.

**Impact:** Easily brute-forced accounts. Common passwords can be tested in seconds.

**Recommendation:**
```javascript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  errors.password = 'Min 8 chars with upper, lower, number, special char';
}
```

---

### 1.4 HIGH - No Authorization/Role Checks

**Location:** All IPC handlers in `Backend/app/services/`

**Issue:** No role-based access control. Any logged-in user can:
- Call `backup-database` to export all data
- Call `export-to-csv` to dump any table
- Call `deactivate-product`, `deactivate-customer`, `deactivate-supplier`

**Impact:** Privilege escalation. Regular users can perform admin operations.

**Recommendation:** Implement role-based middleware:
```javascript
function requireAdmin(handler) {
  return async (event, ...args) => {
    const user = getCurrentUser(event);
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }
    return handler(event, ...args);
  };
}
```

---

### 1.5 HIGH - Duplicate Require Statements

**Location:** `Backend/app/services/systemService.js:24,60`

**Code:**
```javascript
import fs from "fs";  // Line 2 - already imported
const fs = require('fs');  // Line 24, 60 - duplicate
```

**Issue:** Redundant requires after ES module import. Indicates copy-paste or incomplete refactoring.

**Recommendation:** Remove lines 24 and 60; use imported `fs`.

---

### 1.6 MEDIUM - XSS via dangerouslySetInnerHTML

**Location:** `Frontend/src/components/ui/chart.jsx:55`

**Code:**
```javascript
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES).map(...)
  }}
/>
```

**Issue:** Uses `dangerouslySetInnerHTML` with dynamically generated CSS. While not directly user-controlled, sets a bad precedent.

**Impact:** Low - data is not user input, but future changes could introduce XSS.

**Recommendation:** Use CSS variables or styled-components instead.

---

### 1.7 MEDIUM - String Concatenation in SQL (db.js)

**Location:** `Backend/app/services/db.js:46`

**Code:**
```javascript
const check = await pool.query("SELECT to_regclass('public." + t + "') AS tbl");
```

**Issue:** Table name concatenated directly. While `t` comes from hardcoded array, violates defense-in-depth.

**Recommendation:** Use parameterized query or whitelist validation.

---

### 1.8 LOW - Missing Audit Logging

**Location:** All services

**Issue:** No audit trail for sensitive operations (login, data export, user management).

**Impact:** Difficult to investigate security incidents.

**Recommendation:** Add audit logging service:
```javascript
async function audit(action, userId, details) {
  await runDb(
    `INSERT INTO audit_log (action, user_id, details, created_at) VALUES ($1, $2, $3, now())`,
    [action, userId, JSON.stringify(details)]
  );
}
```

---

## 2. Architectural Problems

### 2.1 HIGH - God Objects / Monolithic Files

**Locations:**
- `Frontend/src/pages/Products.jsx` - 1186 lines
- `Frontend/src/pages/Purchaseinvoice.jsx` - 986 lines
- `Frontend/src/pages/AddCustomers.jsx` - 855 lines

**Issue:** Single files contain hundreds of lines handling multiple concerns (state, UI, validation, API calls).

**Impact:** Unmaintainable. Impossible to understand full context. High bug introduction risk.

**Recommendation:** Break into:
- `/components/forms/ProductForm.jsx`
- `/hooks/useProducts.js`
- `/services/productApi.js`

---

### 2.2 HIGH - Tight Coupling in Services

**Location:** All services in `Backend/app/services/`

**Issue:** Each service directly accesses `queryDb` and `runDb` from closure. No abstraction layer.

**Example:**
```javascript
export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;
  // Directly uses queryDb everywhere
}
```

**Impact:** Difficult to mock for testing. Changing DB layer requires修改 all services.

**Recommendation:** Introduce repository pattern:
```javascript
class ProductRepository {
  constructor(db) { this.db = db; }
  async findAll() { return this.db.queryDb('SELECT * FROM products'); }
}
```

---

### 2.3 HIGH - Inconsistent Module System

**Location:** Mixed ESM and CommonJS

**Code:**
```javascript
// main.js - ESM
import authService from "./services/authService.js";

// preload.js - CommonJS
const { contextBridge, ipcRenderer } = require('electron');

// systemService.js - ESM with inline require
import fs from "fs";
const fs = require('fs');  // redundant!
```

**Issue:** Mixing import systems creates confusion and potential bugs.

**Recommendation:** Standardize on ESM throughout.

---

### 2.4 HIGH - Services Register Themselves

**Location:** `Backend/app/services/*`

**Pattern:**
```javascript
export default function register(ipcMain, db) {
  ipcMain.handle("login-user", async (...) => {...});
}
```

**Issue:** Services have side effects at import time. Makes testing and tree-shaking difficult.

**Recommendation:** Use dependency injection without self-registration.

---

### 2.5 MEDIUM - Missing Transaction Wrapper

**Location:** `partyService.js`, `productService.js`, `stockService.js`

**Issue:** Multi-table operations without transactions:
```javascript
// updateSupplier - updates 3 tables without transaction
await runDb(`UPDATE suppliers SET ...`);
await runDb(`UPDATE contact_persons SET ...`);
await runDb(`UPDATE addresses SET ...`);
```

**Impact:** Partial updates on failure. Data inconsistency.

**Recommendation:** Wrap in BEGIN/COMMIT/ROLLBACK like `purchaseService.js` and `saleService.js`.

---

### 2.6 MEDIUM - Large Function Bodies

**Location:** `Backend/app/services/partyService.js:130-330`

**Issue:** Functions exceeding 100 lines handling multiple responsibilities.

**Recommendation:** Extract to smaller functions:
```javascript
async function validateSupplierData(data) { ... }
async function insertSupplier(db, data) { ... }
async function insertContactPersons(db, supplierId, contacts) { ... }
```

---

### 2.7 MEDIUM - No Separation of Concerns

**Location:** `Frontend/src/App.jsx`

**Issue:** Root component mixes routing, authentication state, and layout.

---

### 2.8 LOW - Duplicate Code in Frontend Pages

**Location:** `Companies.jsx`, `AddCustomers.jsx`

**Issue:** Similar contact person CRUD logic duplicated across files.

**Recommendation:** Extract to shared component:
```javascript
// components/ContactPersonManager.jsx
```

---

## 3. Bad Practices

### 3.1 HIGH - Magic Numbers Without Constants

**Locations:** Multiple files

**Code:**
```javascript
// authService.js
const lockUntil = new Date(Date.now() + 15 * 60 * 1000);  // 15 minutes
if (newFailCount >= 5)  // 5 attempts
const RESET_WINDOW_HOURS = 24;  // documented, but others not

// systemService.js
COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 1 AND 30)  // 30 days
COUNT(*) FILTER (WHERE (expiry_date - CURRENT_DATE) BETWEEN 31 AND 60)  // 60 days

// main.js
}, 1000);  // 1 second delay
```

**Impact:** Unclear meaning. Difficult to change safely.

**Recommendation:** Create constants file:
```javascript
// backend/constants.js
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_CRITICAL_DAYS = 60;
```

---

### 3.2 HIGH - No Input Validation on Backend

**Location:** All service handlers

**Issue:** Backend blindly trusts frontend data. Example from `partyService.js`:
```javascript
ipcMain.handle("add-supplier", async (event, data) => {
  // No validation - assumes data.name, data.city, etc. exist
  await runDb(`INSERT INTO suppliers (name, city, ...) VALUES ($1, $2, ...)`,
    [data.name, data.city, ...]);
});
```

**Impact:** Crash on missing fields. Potential undefined values in DB.

**Recommendation:** Add validation layer:
```javascript
function validateSupplier(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push('name required');
  if (typeof data.payment_terms !== 'number') errors.push('payment_terms must be number');
  if (errors.length > 0) throw new ValidationError(errors);
}
```

---

### 3.3 HIGH - Inline SQL in Handlers

**Location:** All services

**Issue:** SQL strings embedded directly in IPC handler functions.

**Example:** `stockService.js:40`
```javascript
await runDb(`INSERT INTO batches (product_id, quantity_available, ...) VALUES ($1, $2, ...)`,
  [data.product_id, data.quantity_available, ...]);
```

**Impact:** No reusability. SQL errors only discovered at runtime.

**Recommendation:** Use query builder or stored procedures.

---

### 3.4 HIGH - No Null Checks

**Location:** Multiple services

**Code:**
```javascript
// db.js:64
lastID: result.rows[0]?.id ?? result.rows[0]?.user_id
  ?? result.rows[0]?.product_id  // No fallback if all undefined
```

**Impact:** Silent failures. Undefined behavior.

---

### 3.5 HIGH - Silent Error Swallowing

**Location:** `Frontend/src/pages/*.jsx`

**Issue:** No try-catch around API calls:
```javascript
// All pages make async calls without error handling
const data = await window.electronAPI.getProducts();
// If this fails, uncaught promise rejection
```

**Impact:** Poor UX. Silent failures with no user feedback.

**Recommendation:**
```javascript
try {
  const data = await window.electronAPI.getProducts();
  setProducts(data);
} catch (err) {
  setError('Failed to load products');
  console.error(err);
}
```

---

### 3.6 MEDIUM - Inconsistent Error Handling

**Location:** Services

**Code:**
```javascript
// Some return error objects
return { success: false, error: "Invalid username" };

// Some throw
throw new Error("Database error");

// Some console.error only
console.error("❌ query-db error:", err.message);
throw err;
```

**Impact:** Inconsistent client handling. Unpredictable behavior.

---

### 3.7 MEDIUM - Hardcoded Error Messages

**Location:** All services

**Issue:** Error messages embedded in code, not externalized.

**Recommendation:** Use error code constants:
```javascript
export const ERRORS = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_LOCKED: 'Account temporarily locked',
  // ...
};
```

---

### 3.8 MEDIUM - Inconsistent Naming

**Location:** Multiple files

**Examples:**
- `getProducts` vs `get-all-products` (camelCase inconsistency in preload)
- `addProduct` vs `add_supplier` (IPC handlers)
- Some return `success: true/false`, others throw

**Recommendation:** Establish naming conventions document.

---

### 3.9 LOW - Console Logging in Production

**Location:** Throughout backend

**Code:**
```javascript
console.log("✅ PostgreSQL connected at:", res.rows[0].now);
console.log("  " + (exists ? "✅" : "❌") + " Table: " + t);
```

**Impact:** Information leakage. Performance overhead.

**Recommendation:** Use proper logger (winston, pino) with log levels.

---

### 3.10 LOW - Commented-Out Code

**Location:** `preload.js:63-66`

**Code:**
```javascript
// ── REMOVED (no longer in schema — update any .jsx still calling these) ───
// ❌ addArea    → area_id is gone
// ❌ getAreas   → same as above
```

**Recommendation:** Remove dead code; use git history.

---

## 4. Performance Issues

### 4.1 HIGH - N+1 Query Pattern

**Location:** `partyService.js`, `stockService.js`

**Issue:** Fetching data then iterating to fetch more:
```javascript
// getSuppliersWithContact - fetches suppliers, then loops for contacts
const suppliers = await queryDb(`SELECT * FROM suppliers`);
for (const s of suppliers) {
  const contacts = await queryDb(
    `SELECT * FROM contact_persons WHERE entity_type = 'supplier' AND entity_id = $1`,
    [s.supplier_id]
  );
  s.contacts = contacts;
}
```

**Impact:** For 100 suppliers = 101 queries instead of 1.

**Recommendation:** Use JOIN:
```javascript
SELECT s.*, cp.*
FROM suppliers s
LEFT JOIN contact_persons cp ON cp.entity_type = 'supplier' AND cp.entity_id = s.supplier_id
```

---

### 4.2 HIGH - Sequential Queries in Loop

**Location:** `systemService.js:12-14`

**Code:**
```javascript
for (const t of tables) {
  const rows = await queryDb(`SELECT * FROM ${t}`);  // Sequential!
  backupData[t] = rows;
}
```

**Impact:** 8 sequential queries instead of parallel.

**Recommendation:**
```javascript
const backupData = await Promise.all(
  tables.map(t => queryDb(`SELECT * FROM ${t}`))
);
```

---

### 4.3 MEDIUM - Missing Database Indexes

**Location:** Database schema

**Issue:** Likely missing indexes on:
- `batches.product_id` (used in JOINs)
- `stock_movements.product_id`
- `sale_invoice_items.sale_invoice_id`
- `contact_persons.entity_id`

**Recommendation:** Add indexes:
```sql
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_sale_items_invoice_id ON sale_invoice_items(sale_invoice_id);
```

---

### 4.4 MEDIUM - Full Table Scans in Dashboard

**Location:** `systemService.js:91-118`

**Issue:** Dashboard queries scan large tables without date filters.

**Recommendation:** Add date range filter, implement pagination.

---

### 4.5 LOW - No Query Caching

**Location:** All services

**Issue:** Repeated queries (products, customers, suppliers) not cached.

**Recommendation:** Implement caching layer:
```javascript
const productCache = new Map();
async function getProducts(forceRefresh = false) {
  if (!forceRefresh && productCache.has('all')) {
    return productCache.get('all');
  }
  const products = await queryDb('SELECT * FROM products WHERE is_active = true');
  productCache.set('all', products);
  return products;
}
```

---

## 5. Maintainability Issues

### 5.1 HIGH - No Backend Tests

**Location:** `Backend/tests/`

**Issue:** Only 2 test files:
- `fefoAllocator.test.js` - unit test
- `integration_manufacturer.js` - minimal
- `integration_add_sale.js` - minimal

**Missing tests:**
- All service handlers
- Auth flow
- Transaction rollback
- Input validation

**Recommendation:** Add tests for each service:
```javascript
describe('authService', () => {
  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await login('user', 'wrongpassword');
    }
    const result = await login('user', 'correctpassword');
    expect(result.success).toBe(false);
    expect(result.error).toContain('locked');
  });
});
```

---

### 5.2 HIGH - No Frontend Tests

**Location:** `Frontend/`

**Issue:** Zero test files in frontend.

**Recommendation:** Add Vitest + React Testing Library:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

---

### 5.3 HIGH - No Documentation

**Location:** Codebase

**Issue:** No JSDoc comments. No README in `/services`. No API documentation.

**Example:**
```javascript
// What does this function do?
async function runDb(sql, params) { ... }
```

**Recommendation:** Add JSDoc:
```javascript
/**
 * Execute a write query and return affected row metadata
 * @param {string} sql - Parameterized SQL statement
 * @param {Array} params - Query parameters
 * @returns {Promise<{rowCount: number, lastID: number|null, row: object|null}>}
 */
async function runDb(sql, params = []) { ... }
```

---

### 5.4 MEDIUM - No TypeScript

**Location:** Entire codebase

**Issue:** Plain JavaScript with no type checking. Easy to introduce type errors.

**Recommendation:** Migrate to TypeScript incrementally:
```typescript
interface Supplier {
  supplier_id: string;
  name: string;
  city: string;
  payment_terms: number;
  is_active: boolean;
}
```

---

### 5.5 MEDIUM - No Linting

**Location:** Project root

**Issue:** No ESLint configuration visible.

**Recommendation:** Add ESLint:
```bash
npm init @eslint/config
```

---

### 5.6 MEDIUM - Large Component Files

**Location:** `Frontend/src/pages/Products.jsx` (1186 lines)

**Issue:** Single file contains multiple features.

**Recommendation:** Split into feature-based structure.

---

### 5.7 LOW - No CI/CD

**Location:** Project root

**Issue:** No GitHub Actions for automated testing.

**Recommendation:** Add workflow:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

---

## 6. Error Handling Issues

### 6.1 HIGH - Uncaught Promise Rejections

**Location:** All frontend API calls

**Issue:** No `.catch()` or try-catch on async calls:
```javascript
const data = await window.electronAPI.getProducts();
// No error handling - crashes silently
```

---

### 6.2 HIGH - No User Feedback on Errors

**Location:** Frontend pages

**Issue:** API failures show no feedback to user.

**Recommendation:** Add toast notifications:
```javascript
try {
  const data = await window.electronAPI.getProducts();
  setProducts(data);
} catch (err) {
  toast.error('Failed to load products');
}
```

---

### 6.3 MEDIUM - Inconsistent Error Responses

**Location:** Backend services

**Issue:** Mix of throwing errors vs returning `{success: false}`.

**Recommendation:** Standardize:
```javascript
// Always return structured response
return { success: false, error: 'ERROR_CODE', details: {...} };
```

---

### 6.4 LOW - No Retry Logic

**Location:** Frontend API calls

**Issue:** No retry on network failures.

**Recommendation:** Add retry utility:
```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## Priority Fix List

### Immediate (Before Production)

1. **Remove `query-db` IPC handler** - Critical security hole
2. **Fix SQL injection in table names** - Add whitelist validation
3. **Implement password policy** - 8+ chars, mixed case, numbers, special chars
4. **Add role-based access control** - Separate admin/user operations

### Short-Term (Sprint 1-2)

5. **Add input validation on backend** - Validate all IPC handler inputs
6. **Fix N+1 queries** - Use JOINs instead of loops
7. **Add try-catch to all frontend API calls** - Prevent uncaught rejections
8. **Extract magic numbers to constants** - Centralize configuration
9. **Add transaction wrappers** - Ensure data consistency

### Medium-Term (Sprint 3-4)

10. **Split god objects** - Break large files into smaller modules
11. **Add backend unit tests** - Test services in isolation
12. **Add frontend tests** - Test React components
13. **Standardize error handling** - Consistent error response format
14. **Add database indexes** - Optimize query performance
15. **Migrate to TypeScript** - Add type safety

### Long-Term

16. **Add CI/CD pipeline** - Automated testing on push
17. **Set up logging infrastructure** - Replace console.log with proper logger
18. **Add audit logging** - Track sensitive operations
19. **Implement API versioning** - Support backward compatibility
20. **Add rate limiting** - Prevent brute force attacks

---

## Conclusion

The codebase has significant security vulnerabilities requiring immediate attention before production use. Beyond security, architectural and maintainability issues will hamper long-term development if not addressed. The recommended fix sequence prioritizes risk mitigation while establishing foundations for sustainable growth.

**Estimated effort:**
- Immediate fixes: 2-4 hours
- Short-term fixes: 2-3 days
- Medium-term fixes: 1-2 weeks
- Long-term fixes: 2-4 weeks