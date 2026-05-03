# PharmaX Pharmacy Billing App - Architecture Documentation

## 5. Architecture

### 5.1 Chosen Architecture Pattern

**Pattern**: Layered (N-Tier) Architecture with Service Modules + Dependency Injection (CURRENT IMPLEMENTATION)

**Justification**:
- **Layered architecture** naturally separates concerns into presentation, business logic, and data access layers, making the desktop Electron application modular and testable.
- **Service-oriented design** (already implemented) encapsulates business logic into domain-specific modules (authService, productService, saleService, purchaseService, stockService, ledgerService, partyService, systemService), enabling parallel development and easy maintenance.
- **Dependency Injection** pattern used in main.js ensures services receive database context (`{ queryDb, runDb, pool }`) at initialization, reducing coupling and improving testability.
- **IPC Handler Registration** (Electron-specific) sits in each service module, mapping backend logic directly to frontend-accessible channels without requiring a separate router layer.
- **ES6 Module System** (import/export) provides clean, modern code organization compared to CommonJS.
- This pattern enables future expansion: REST API layer can wrap services, database abstraction via repositories can replace direct queries, or role-based access control can be added at handler level without touching core logic.

---

### 5.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER (React)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Pages          │  │   Components     │  │   Hooks          │          │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤          │
│  │ AddSale.jsx      │  │ ActivityList     │  │ useCustomerData  │          │
│  │ Dashboard.jsx    │  │ AnalyticsChart   │  │ useSaleCart      │          │
│  │ Products.jsx     │  │ Header, Sidebar  │  │ useFormValidation│          │
│  │ Purchaseinvoice  │  │ Dialogs, Tables  │  │ useElectronAPI   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                               │
│                    ↓ IPC Events (window.electronAPI)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER (Electron Main Process)                     │
│              Location: Backend/app/services/                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ main.js (Bootstrap & Initialization)                                │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Creates Electron app window                                       │   │
│  │ • Loads environment variables                                       │   │
│  │ • Initializes database connection pool                              │   │
│  │ • Creates database context: { queryDb, runDb, pool }               │   │
│  │ • Registers all service modules (dependency injection)              │   │
│  │ • Shows splash screen while loading                                │   │
│  │                                                                      │   │
│  │ const db = { queryDb, runDb, pool };                               │   │
│  │ authService(ipcMain, db);                                          │   │
│  │ productService(ipcMain, db);                                       │   │
│  │ saleService(ipcMain, db);                                          │   │
│  │ purchaseService(ipcMain, db);                                      │   │
│  │ // ... etc                                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ SERVICE MODULES (Domain-Specific Business Logic)                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Each service: export default function(ipcMain, db) { ... }        │   │
│  │  • Receives ipcMain router and database context                     │   │
│  │  • Registers IPC handlers for its domain                            │   │
│  │  • Contains all business logic for that domain                      │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐               │   │
│  │  │ authService.js       │  │ productService.js    │               │   │
│  │  ├──────────────────────┤  ├──────────────────────┤               │   │
│  │  │ • login handler      │  │ • getProducts        │               │   │
│  │  │ • signup handler     │  │ • addProduct         │               │   │
│  │  │ • password validation│  │ • updateProduct      │               │   │
│  │  │ • token verification │  │ • searchProducts     │               │   │
│  │  │ • session mgmt       │  │ • deactivateProduct  │               │   │
│  │  └──────────────────────┘  └──────────────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐               │   │
│  │  │ saleService.js       │  │ purchaseService.js   │               │   │
│  │  ├──────────────────────┤  ├──────────────────────┤               │   │
│  │  │ • add-sale (FEFO)    │  │ • createPurchaseOrder               │   │
│  │  │ • validateCredit     │  │ • confirmReceipt(GRN)               │   │
│  │  │ • confirmSale        │  │ • processReturn      │               │   │
│  │  │ • getSaleInvoice     │  │ • getPurchaseOrders  │               │   │
│  │  │ • allocateBatches()* │  │ • getGRNs            │               │   │
│  │  └──────────────────────┘  └──────────────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐               │   │
│  │  │ stockService.js      │  │ ledgerService.js     │               │   │
│  │  ├──────────────────────┤  ├──────────────────────┤               │   │
│  │  │ • getAvailability    │  │ • getSupplierLedger  │               │   │
│  │  │ • getStockSummary    │  │ • getCustomerBalance │               │   │
│  │  │ • getExpiryStatus    │  │ • exportLedger       │               │   │
│  │  │ • getBatches         │  │ • getLedgerReport    │               │   │
│  │  │ • getValuation       │  │ • reconcileLedger    │               │   │
│  │  └──────────────────────┘  └──────────────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐               │   │
│  │  │ partyService.js      │  │ systemService.js     │               │   │
│  │  ├──────────────────────┤  ├──────────────────────┤               │   │
│  │  │ (Suppliers & Customers)   (System Operations) │               │   │
│  │  ├──────────────────────┤  ├──────────────────────┤               │   │
│  │  │ • getSuppliers       │  │ • backup             │               │   │
│  │  │ • addSupplier        │  │ • export             │               │   │
│  │  │ • getCustomers       │  │ • restore            │               │   │
│  │  │ • addCustomer        │  │ • getSysSettings     │               │   │
│  │  │ • getContactPersons  │  │ • updateSettings     │               │   │
│  │  │ • addContactPerson   │  │ • getDashboardData   │               │   │
│  │  └──────────────────────┘  └──────────────────────┘               │   │
│  │                                                                      │   │
│  │  * FEFO allocation (calculateFefoPlan) called from saleService    │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Shared Database Context (Dependency Injection)                      │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • queryDb(sql, params): Execute SELECT queries                      │   │
│  │ • runDb(sql, params): Execute INSERT/UPDATE/DELETE queries          │   │
│  │ • pool: Full PostgreSQL connection pool for transactions            │   │
│  │                                                                      │   │
│  │ All services receive same context instance:                         │   │
│  │ service(ipcMain, { queryDb, runDb, pool })                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                                      │
│              Location: Backend/app/services/db.js                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PostgreSQL Connection Management:                                          │
│  ├─ const pool = new Pool({ host, port, database, user, password })        │
│  ├─ queryDb(sql, params) → pool.query() → Promise<QueryResult>            │
│  ├─ runDb(sql, params) → pool.query() → Promise<QueryResult>              │
│  ├─ Pool connection testing on app startup                                 │
│  └─ Connection error event handlers                                        │
│                                                                               │
│  Direct SQL Execution Pattern:                                              │
│  • Services write raw SQL with parameterized queries ($1, $2, etc.)       │
│  • Uses PostgreSQL advisory locking: FOR UPDATE (pessimistic locking)      │
│  • Transaction support: client.query('BEGIN'), COMMIT, ROLLBACK            │
│  • Data access layer is THIN—mainly connection pooling                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                     │
│              Location: database/pharmax_schema.sql                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PostgreSQL 15+                                                              │
│  ├─ Tables (BCNF normalized):                                               │
│  │  ├─ users, manufacturers, categories, products                           │
│  │  ├─ suppliers, customers, contacts                                       │
│  │  ├─ batches, stock_movements (immutable ledger)                          │
│  │  ├─ purchase_invoices, purchase_invoice_items                            │
│  │  ├─ sale_invoices, sale_invoice_items                                    │
│  │  ├─ payments, expenses                                                    │
│  │  └─ supplier_ledger, customer_ledger (views)                             │
│  │                                                                           │
│  ├─ CONSTRAINTS & TRIGGERS:                                                 │
│  │  ├─ CHECK constraints (quantity >= 0, status finality)                   │
│  │  ├─ UNIQUE constraints (name, DRAP numbers)                              │
│  │  ├─ FK constraints (cascade on update)                                   │
│  │  ├─ Triggers: fn_sync_batch_quantity() - atomic stock sync              │
│  │  ├─ Triggers: fn_check_credit_limit() - credit validation                │
│  │  └─ Triggers: fn_rebuild_product_search_vector() - full-text search     │
│  │                                                                           │
│  └─ SEQUENCES:                                                              │
│     └─ sale_invoice_num_seq (gapless invoice numbering)                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

```

---

### 5.3 Component Descriptions

#### **Presentation Layer / UI**

**Responsibility**: Render user interface and collect user input; delegate business logic to backend via Electron IPC.

**Sub-Components**:

1. **Pages** (`/src/pages/`)
   - Top-level route components: `AddSale.jsx`, `Dashboard.jsx`, `Products.jsx`, `Purchaseinvoice.jsx`, etc.
   - Each page handles one major workflow (e.g., "Create a Sale", "View Stock", "Generate Report")
   - Orchestrates child components and custom hooks
   - Does NOT contain business logic or raw Electron API calls; delegates to backend services

2. **Components** (`/src/components/`)
   - Reusable UI modules: `ActivityList`, `AnalyticsChart`, `Header`, `Sidebar`, `Dialogs`
   - Shared UI library: `avatar`, `button`, `card`, `table`, `dialog`, `select`, etc. (Shadcn-style)
   - Pure presentation logic; props-driven, no side effects
   - Example: `AnalyticsChart` receives data array, renders chart; doesn't fetch data

3. **Custom Hooks** (`/src/hooks/`)
   - **`useElectronAPI.js`**: Abstraction layer for calling backend services via IPC
   - **`use-mobile.js`**: Detect mobile/responsive layout
   - Each page can extract data-fetching logic into custom hooks (future enhancement)
   - Example pattern:
     ```javascript
     const useCustomerData = () => {
       const [customers, setCustomers] = useState([]);
       const api = useElectronAPI();
       useEffect(() => {
         api.call('get-customers').then(setCustomers);
       }, []);
       return customers;
     };
     ```

4. **API Communication Pattern**:
   - Pages call `window.electronAPI` methods (injected by preload.js)
   - Example: `await window.electronAPI.invoke('add-sale', saleData)`
   - Maps directly to backend IPC handlers registered in service modules

---

#### **Service Layer / IPC Handlers**

**Responsibility**: Bridge between frontend (Electron IPC) and backend business logic; register handlers; manage state transitions.

**Current Structure** (`/backend/app/services/`):

Each service module exports a default function that:
1. Receives `ipcMain` (Electron router) and `db` (database context)
2. Registers IPC handlers for its domain
3. Contains ALL business logic for that domain
4. Returns nothing (side-effect: handler registration)

Example pattern:
```javascript
// services/saleService.js
export default function registerSaleHandlers(ipcMain, db) {
  const { queryDb, runDb, pool } = db;
  
  ipcMain.handle('add-sale', async (event, data) => {
    try {
      // Business logic here
      const result = await processSaleTransaction(data, pool);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
```

**Concrete Services**:

1. **`authService.js`**
   - Handlers: `login`, `signup`, `logout`, `verify-token`, `get-user`, `change-password`
   - Validates credentials, manages session state, handles user authentication
   - Direct SQL: queries `users` table, validates password hashes

2. **`productService.js`**
   - Handlers: `get-products`, `add-product`, `update-product`, `search-products`, `get-categories`, `deactivate-product`
   - Product CRUD operations, filtering, searching, categorization
   - Direct SQL: INSERT/UPDATE/SELECT on `products`, `categories`, rebuilds search vectors

3. **`partyService.js`** (Suppliers & Customers)
   - Handlers: `get-suppliers`, `add-supplier`, `get-customers`, `add-customer`, `get-contact-persons`, `add-contact-person`
   - Manages two party types: suppliers and customers
   - Direct SQL: INSERT/UPDATE/SELECT on `suppliers`, `customers`, `contacts`

4. **`saleService.js`** (Complex transaction logic)
   - **Core Handler**: `add-sale`
     - Receives sale data (customerId, items[], userId)
     - Locks batches with pessimistic locking: `FOR UPDATE`
     - Runs FEFO allocation via `calculateFefoPlan(data.items, lockedBatches)`
     - Inserts invoice header + line items (bulk INSERT)
     - Records stock movements to immutable ledger
     - Updates customer balance
   - **Other Handlers**: `get-sale-invoices`, `get-sale-details`, `confirm-sale`, `print-sale`
   - Direct SQL: Complex multi-step transaction with batch locking

5. **`purchaseService.js`**
   - Handlers: `get-purchase-orders`, `add-purchase-order`, `confirm-receipt`, `get-grns`, `process-return`
   - Manages purchase workflows: GRN (Goods Receipt Note), batch creation, return processing
   - Direct SQL: Multi-step transactions on `purchase_invoices`, `batches`, `stock_movements`

6. **`stockService.js`**
   - Handlers: `get-stock-summary`, `get-availability`, `get-expiry-status`, `get-batches`, `get-valuation`
   - Inventory queries: available quantity, expiry alerts, FIFO valuation
   - Direct SQL: Aggregation queries joining `batches`, `stock_movements`, `products`

7. **`ledgerService.js`**
   - Handlers: `get-supplier-ledger`, `get-customer-ledger`, `get-balance`, `export-ledger`
   - Running balance calculations, transaction history, AR/AP aging
   - Direct SQL: Complex JOINs across `invoices`, `payments`, `stock_movements`

8. **`systemService.js`**
   - Handlers: `backup-database`, `export-data`, `import-data`, `get-dashboard-data`, `get-system-settings`
   - Database backup, data export (CSV, PDF), dashboard aggregations
   - Direct SQL: Full-table scans, aggregations for dashboard metrics

9. **`db.js`** (Database Adapter)
   - Exports: `queryDb(sql, params)`, `runDb(sql, params)`, `pool`, `testConnection()`
   - Creates and manages PostgreSQL connection pool
   - `queryDb()`: Wrapper for `pool.query()`, used for SELECT statements
   - `runDb()`: Wrapper for `pool.query()`, used for INSERT/UPDATE/DELETE
   - Tests connection on app startup, logs connection status

---

#### **Dependency Injection Pattern (Current Implementation)**

**Bootstrap in main.js**:
```javascript
// main.js
const db = { queryDb, runDb, pool };

// Each service receives ipcMain and db context
authService(ipcMain, db);
productService(ipcMain, db);
saleService(ipcMain, db);
purchaseService(ipcMain, db);
stockService(ipcMain, db);
ledgerService(ipcMain, db);
partyService(ipcMain, db);
systemService(ipcMain, db);
```

**Benefits**:
- ✅ All services can be tested with mock `db` object
- ✅ Easy to swap database implementation (PostgreSQL → MongoDB)
- ✅ Centralized error handling and logging
- ✅ Services remain pure functions (no singletons or global state)

---

#### **Data Access Layer**

**Responsibility**: Execute database queries; manage connection pool; provide query execution interface.

**Current Implementation** (`/backend/app/services/db.js`):

```javascript
const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "Pharmax",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

export async function queryDb(sql, params = []) {
  return await pool.query(sql, params);
}

export async function runDb(sql, params = []) {
  return await pool.query(sql, params);
}

export async function testConnection() {
  const res = await pool.query("SELECT NOW()");
  console.log("✅ PostgreSQL connected:", res.rows[0].now);
}
```

**Design Notes**:
- **Direct SQL Pattern**: Services write parameterized SQL queries directly
- **Connection Pool**: PostgreSQL connection pooling for concurrent requests
- **No ORM/Query Builder**: Raw SQL provides:
  - ✅ Full control over query optimization
  - ✅ Access to PostgreSQL-specific features (arrays, JSON, advisory locks, triggers)
  - ✅ Explicit locking: `FOR UPDATE` (pessimistic locking in `add-sale`)
- **Transaction Support**: Services can use `pool.connect()` for multi-statement transactions
  ```javascript
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Multiple queries here
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
  ```

**Future Enhancement** (Phase 1 of refactoring):
- Extract REPOSITORY pattern layer:
  - `ProductRepository`, `BatchRepository`, `CustomerRepository`, etc.
  - Encapsulate SQL queries per entity
  - Hide database details from services
  - Enable database swaps without changing service code

---

#### **Database Layer**

**Responsibility**: Persistent data storage; enforce constraints; maintain data integrity via triggers.

**PostgreSQL 15+ Schema** (see [database/pharmax_schema.sql](database/pharmax_schema.sql)):

1. **Core Tables** (BCNF normalized):
   - **Authentication**: `users` (username, password_hash, is_active)
   - **Master Data**: `manufacturers`, `categories`, `products`
   - **Parties**: `suppliers`, `customers`, `contacts` (contact_entity enum)
   - **Inventory**: `batches` (product_id, supplier_id, expiry_date, quantity_received, quantity_available)
   - **Audit Trail**: `stock_movements` (immutable, append-only ledger)
   - **Sales**: `sale_invoices`, `sale_invoice_items` (draft/confirmed status)
   - **Purchases**: `purchase_invoices`, `purchase_invoice_items`
   - **Financials**: `payments`, `expenses`, `supplier_ledger` (view), `customer_ledger` (view)

2. **Constraint Strategy**:
   - **CHECK constraints**: 
     - `quantity_available >= 0` (no negative stock)
     - `is_active = FALSE → deactivated_at NOT NULL` (deactivation integrity)
     - `status = 'confirmed' → deactivated_at IS NOT NULL` (status finality)
   - **UNIQUE constraints**: Product name, Manufacturer name, DRAP numbers
   - **FK constraints**: CASCADE on UPDATE (preserve referential integrity)

3. **Trigger Functions** (Database-level business logic):
   - **`fn_sync_batch_quantity()`**: 
     - After `stock_movements` INSERT, atomically updates `batches.quantity_available`
     - Ensures stock sync at database layer (race-condition immune)
   - **`fn_check_credit_limit()`**: 
     - Before `sale_invoices` UPDATE to 'confirmed', validates customer AR balance
     - Prevents sales exceeding credit limit
   - **`fn_rebuild_product_search_vector()`**: 
     - On product/manufacturer name update, regenerates full-text search vector
     - Enables fast ILIKE searching

4. **Sequences**:
   - **`sale_invoice_num_seq`**: Gapless invoice numbering (format: `INV-2026-000001`)
   - Pre-seeded to prevent duplicates on app restart

5. **Data Integrity Guarantees**:
   - All monetary values: `NUMERIC(15,2)` (never FLOAT → prevents rounding errors)
   - All timestamps: `TIMESTAMPTZ` (audit trail + timezone safety)
   - Soft deletes everywhere: `is_active + deactivated_at` (preserves history, enables undelete)
   - Append-only for financial records: Only INSERT on `stock_movements`, no UPDATE/DELETE (audit trail)

---

## Current Implementation Status

| Layer | Status | Location | Notes |
|-------|--------|----------|-------|
| **Presentation** | ✅ Complete | `/src/pages`, `/src/components` | React-based, uses IPC bridge |
| **Service Layer** | ✅ Complete | `/app/services/` | 9 domain-specific service modules |
| **IPC Router** | ✅ Embedded | Within each service | Handlers registered in service functions |
| **Data Access** | 🟡 Direct SQL | `/app/services/db.js` | No repository layer yet (future enhancement) |
| **Database** | ✅ Production | PostgreSQL 15+ | BCNF normalized, triggers, constraints |
| **Validation** | 🟡 Partial | Inline in handlers | No DTO layer yet (future enhancement) |
| **Testing** | ✅ Partial | `/tests/` | Integration tests for sales & manufacturer |

---

## Architecture Maturity

**Current**: Semi-refactored service-oriented + direct SQL
- ✅ Concerns separated into service modules
- ✅ Dependency injection pattern in place
- ✅ ES6 modules for clean code organization
- 🟡 Direct SQL (no repository abstraction)
- 🟡 No DTO/validation layer
- 🟡 Fat service modules (business logic + SQL mixed)

**Future (Recommended Refactoring Phases)**:

| Phase | Task | Impact | Timeline |
|-------|------|--------|----------|
| 1 | Extract repositories (ProductRepository, BatchRepository, etc.) | DIP compliant, testable, database-agnostic | 1-2 weeks |
| 2 | Add DTO validation layer (Zod schemas) | Input safety, consistent error handling | 1 week |
| 3 | Extract custom hooks (useCustomerData, useSaleCart, etc.) | Testable React components, code reuse | 1 week |
| 4 | Build API adapter layer (swap Electron ↔ HTTP) | REST API ready, web version possible | 1-2 weeks |
| 5 | Add integration tests for all services | Regression protection, documentation | 1-2 weeks |

**Result**: Enterprise-grade, fully SOLID-compliant, testable architecture.

---

## Architecture Benefits

| Principle | Benefit | Example |
|-----------|---------|---------|
| **Layered** | Parallel development | Frontend team builds pages while backend team builds services |
| **Repository** | Database-agnostic | Switch from PostgreSQL to MongoDB by creating new `MongoRepository` |
| **Dependency Inversion** | Testable | Unit test `SaleService` with mock repositories; no database needed |
| **Service-oriented** | Reusable | `SaleService` used by IPC handlers, REST API (future), CLI tool (future) |
| **Strategy Pattern** | Extensible | Add `LifoStrategy` allocation without modifying `SaleService` |
| **DTO Validation** | Secure | Invalid data rejected at app boundary; services always receive clean data |
| **Database Triggers** | Atomic | Stock reconciliation happens at database layer; no race conditions |

---

## Refactoring Progress

### ✅ COMPLETED

**Phase 1: Service Extraction** (✅ DONE)
- Extracted 9 domain-specific service modules from monolithic main.js
- Services: authService, productService, partyService, saleService, purchaseService, stockService, ledgerService, systemService, db
- Each service registers its own IPC handlers via dependency injection
- main.js reduced to bootstrap & window management (~150 lines vs. 1500+)
- ES6 modules (import/export) for clean code organization

**Test Coverage**:
- ✅ Integration test for `add-sale` transaction (FEFO allocation)
- ✅ Integration test for manufacturer lifecycle

---

### 🟡 IN PROGRESS / RECOMMENDED

**Phase 2: Repository Pattern Implementation** (🔲 TODO)
- **Goal**: Decouple business logic from SQL; enable database swaps
- **Impact**: DIP-compliant, fully testable services without database
- **Effort**: 1-2 weeks
- **Files to Create**:
  - `/backend/app/repositories/BaseRepository.js`
  - `/backend/app/repositories/ProductRepository.js`
  - `/backend/app/repositories/BatchRepository.js`
  - `/backend/app/repositories/InvoiceRepository.js`
  - `/backend/app/repositories/LedgerRepository.js`
  - (etc. for each entity)
- **Changes**:
  - Services call `this.productRepo.findById(id)` instead of `queryDb(...)`
  - Repositories handle SQL details
  - Easy to mock repositories in tests

**Phase 3: DTO & Validation Layer** (🔲 TODO)
- **Goal**: Validate input at handler boundary; consistent error handling
- **Impact**: Security, type safety, frontend error handling consistency
- **Effort**: 1 week
- **Files to Create**:
  - `/backend/app/dtos/ProductDTO.js` (with Zod schema)
  - `/backend/app/dtos/SaleDTO.js`
  - `/backend/app/dtos/CustomerDTO.js`
  - (etc. for each input type)
  - `/backend/app/services/responseHandler.js` (standardized responses)
- **Changes**:
  ```javascript
  ipcMain.handle('add-sale', async (event, data) => {
    try {
      const validatedData = SaleDTO.validate(data);
      const result = await saleService.processSale(validatedData);
      return ServiceResponse.success(result);
    } catch (err) {
      return ServiceResponse.error(err.message);
    }
  });
  ```

**Phase 4: Frontend API Abstraction** (🔲 TODO)
- **Goal**: Testable React components; easy to swap IPC ↔ HTTP
- **Impact**: Unit testable components, future REST API support
- **Effort**: 1 week
- **Files to Create**:
  - `/frontend/src/services/apiAdapter.js` (interface)
  - `/frontend/src/services/ElectronApiAdapter.js` (IPC implementation)
  - `/frontend/src/services/HttpApiAdapter.js` (future REST)
  - `/frontend/src/hooks/useCustomerData.js`
  - `/frontend/src/hooks/useSaleCart.js`
  - `/frontend/src/hooks/useFormValidation.js`
- **Changes**:
  ```javascript
  // Old: Direct IPC in components
  const customers = await window.electronAPI.invoke('get-customers');
  
  // New: Abstracted hook
  const customers = useCustomerData();
  ```

**Phase 5: Integration Test Suite** (🔲 TODO)
- **Goal**: Full regression protection for all workflows
- **Effort**: 1-2 weeks
- **Tests to Add**:
  - `integration_purchase.js` - Complete PO → GRN → returns flow
  - `integration_ledger.js` - Ledger balance calculations
  - `integration_stock.js` - Inventory tracking across transactions
  - `integration_auth.js` - Login, signup, token validation
  - `integration_reports.js` - Dashboard & ledger exports

---

## Architecture Benefits (Current State)

| Principle | Benefit | Example |
|-----------|---------|---------|
| **Service-oriented** | Parallel development | Frontend team builds pages while backend develops services |
| **Dependency Injection** | Testable | Services receive `db` context; easy to mock in tests |
| **ES6 Modules** | Clean code | Clear imports; easier to track dependencies |
| **Direct SQL** | Flexibility | Access PostgreSQL-specific features (arrays, JSON, locking) |
| **Database Triggers** | Atomic operations | Stock reconciliation happens at DB layer; race-condition immune |
| **Soft Deletes** | Data preservation | Never lose data; enable undelete; historical audit trail |

---

## Architecture Maturity

**Current State**:
- ✅ Services separated into 9 modules
- ✅ Dependency injection pattern
- ✅ ES6 modules
- ✅ Database triggers for atomicity
- 🟡 Direct SQL (no repository abstraction)
- 🟡 No DTO/validation layer
- 🟡 Handlers scattered across services (no central router)

**After Phase 2-5 Completion**:
- ✅ Full SOLID compliance
- ✅ Fully testable (unit + integration)
- ✅ Database-agnostic (PostgreSQL → MongoDB swap possible)
- ✅ REST API-ready (Electron IPC → HTTP transparent)
- ✅ Production-grade architecture

---

## Recommended Quick Wins (High Impact, Low Effort)

| Task | Impact | Time | Difficulty |
|------|--------|------|-----------|
| Add DTO validation layer (Phase 3) | 🔴 High | 1 week | 🟡 Medium |
| Create repository pattern (Phase 2) | 🔴 High | 2 weeks | 🟡 Medium |
| Extract React custom hooks (Phase 4) | 🟡 Medium | 1 week | 🟢 Easy |
| Write integration tests (Phase 5) | 🔴 High | 2 weeks | 🟡 Medium |
| Add response standardization | 🟡 Medium | 2 days | 🟢 Easy |

---

## How to Continue Development

**For New Features**:
1. Create new service module in `/backend/app/services/`
2. Register IPC handlers in that service
3. Follow existing patterns (dependency injection, parameterized queries)
4. Add integration test in `/backend/tests/`

**For Refactoring**:
1. Start with Phase 2 (repositories) — blocks Phase 3-5
2. Work on most-used services first (saleService, purchaseService)
3. Write tests before and after refactoring

**For Maintenance**:
- Keep services domain-focused (max 200-300 lines per service)
- Add business logic to database triggers (fn_* functions)
- Use soft deletes everywhere (maintain history)

