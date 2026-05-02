# PharmaX Pharmacy Billing App - Architecture Documentation

## 5. Architecture

### 5.1 Chosen Architecture Pattern

**Pattern**: Layered (N-Tier) Architecture with Repository Pattern (Current State) → **Recommended: Clean Layered Architecture with Dependency Inversion**

**Justification**:
- **Layered architecture** naturally separates concerns into presentation, business logic, and data access layers, making the desktop Electron application modular and testable.
- **Repository pattern** abstracts database access, allowing the business logic to remain independent of PostgreSQL implementation details and enabling future data store migrations.
- **Dependency Inversion** ensures high-level modules (business logic, services) depend on abstractions (interfaces), not concrete implementations (database drivers, Electron API), making the system resilient to technology changes.
- **IPC Handler Layer** (Electron-specific) sits between presentation and business logic, enabling communication between React frontend and Node.js backend without tight coupling.
- This pattern supports future expansion: adding REST API, switching databases, or implementing role-based access control without major refactoring.

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
│                    ↓ IPC Events (Electron Bridge)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│              APPLICATION / IPC HANDLER LAYER (Electron Main)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ipcHandlers.js (Router Layer)                                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • Maps IPC channel names to service methods                          │   │
│  │ • Delegates business logic to appropriate service                   │   │
│  │ • Converts Electron IPC responses to frontend-friendly format        │   │
│  │                                                                       │   │
│  │  ipcMain.handle("add-sale", (e, data) =>                           │   │
│  │    saleService.processSale(data)                                    │   │
│  │  );                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ DTOs & Validation Layer (Input Contracts)                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • ProductDTO.validate()  (validates product creation)               │   │
│  │ • SaleDTO.validate()     (validates sale invoice)                   │   │
│  │ • CustomerDTO.validate() (validates customer creation)              │   │
│  │ • Uses Zod for runtime schema validation                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOMAIN / BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ SERVICE MODULES (Core Business Logic)                             │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │                                                                     │     │
│  │  ┌──────────────────────┐  ┌──────────────────────┐              │     │
│  │  │ AuthService          │  │ ProductService       │              │     │
│  │  ├──────────────────────┤  ├──────────────────────┤              │     │
│  │  │ • login()            │  │ • listProducts()     │              │     │
│  │  │ • signup()           │  │ • createProduct()    │              │     │
│  │  │ • validatePassword() │  │ • updateProduct()    │              │     │
│  │  │ • verifyToken()      │  │ • deactivateProduct()              │     │
│  │  └──────────────────────┘  └──────────────────────┘              │     │
│  │                                                                     │     │
│  │  ┌──────────────────────┐  ┌──────────────────────┐              │     │
│  │  │ SaleService          │  │ PurchaseService      │              │     │
│  │  ├──────────────────────┤  ├──────────────────────┤              │     │
│  │  │ • processSale()      │  │ • createPO()         │              │     │
│  │  │ • validateCredit()   │  │ • confirmReceipt()   │              │     │
│  │  │ • allocateBatches()* │  │ • processReturn()    │              │     │
│  │  │ • confirmInvoice()   │  │ • generateGRN()      │              │     │
│  │  └──────────────────────┘  └──────────────────────┘              │     │
│  │                                                                     │     │
│  │  ┌──────────────────────┐  ┌──────────────────────┐              │     │
│  │  │ StockService         │  │ LedgerService        │              │     │
│  │  ├──────────────────────┤  ├──────────────────────┤              │     │
│  │  │ • getAvailability()  │  │ • getSupplierLedger()               │     │
│  │  │ • checkExpiry()      │  │ • getCustomerBalance()              │     │
│  │  │ • calculateValuation()   │ • exportLedger()     │              │     │
│  │  └──────────────────────┘  └──────────────────────┘              │     │
│  │                                                                     │     │
│  │  ┌──────────────────────────────────────────────────────┐        │     │
│  │  │ ALLOCATION STRATEGY PATTERN (Polymorphic)           │        │     │
│  │  ├──────────────────────────────────────────────────────┤        │     │
│  │  │ • AllocationStrategy (interface)                    │        │     │
│  │  │   - FefoStrategy  (oldest expiry first)             │        │     │
│  │  │   - FifoStrategy  (first in, first out)             │        │     │
│  │  │   - WeightedAvgStrategy (cost-based)                │        │     │
│  │  │                                                       │        │     │
│  │  │ • SaleService depends on AllocationStrategy         │        │     │
│  │  │   (injected, can swap implementations)              │        │     │
│  │  └──────────────────────────────────────────────────────┘        │     │
│  │                                                                     │     │
│  │  * FEFO Logic (calculateFefoPlan) now integrated here             │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                  ↓                                            │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ENTITIES (Pure Domain Objects)                                    │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │ • Product, Batch, Customer, Supplier                              │     │
│  │ • SaleInvoice, PurchaseInvoice, Payment                           │     │
│  │ • StockMovement, Ledger Entry                                     │     │
│  │ (Minimal logic, mostly data + validation)                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER (Repositories)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ REPOSITORY PATTERN (Database Abstraction)                       │       │
│  ├──────────────────────────────────────────────────────────────────┤       │
│  │                                                                   │       │
│  │  Repository Base Class:                                         │       │
│  │  ├─ getById(id)                                                 │       │
│  │  ├─ getAll()                                                    │       │
│  │  ├─ create(entity)                                              │       │
│  │  ├─ update(entity)                                              │       │
│  │  └─ delete(id)                                                  │       │
│  │                                                                   │       │
│  │  Concrete Repositories:                                         │       │
│  │  • ProductRepository                                            │       │
│  │  • BatchRepository                                              │       │
│  │  • CustomerRepository                                           │       │
│  │  • SupplierRepository                                           │       │
│  │  • SaleInvoiceRepository                                        │       │
│  │  • PurchaseInvoiceRepository                                    │       │
│  │  • StockMovementRepository                                      │       │
│  │  • LedgerRepository                                             │       │
│  │                                                                   │       │
│  │  SPECIALIZED QUERIES:                                           │       │
│  │  • BatchRepository.getActiveByProduct(productId)                │       │
│  │  • BatchRepository.getByExpiry(expiryRange)                     │       │
│  │  • StockMovementRepository.getByReference(refId, refType)       │       │
│  │  • SaleInvoiceRepository.getByCustomer(customerId, status)      │       │
│  │                                                                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                  ↓                                            │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ DATABASE ADAPTER (PostgreSQL Abstraction)                       │       │
│  ├──────────────────────────────────────────────────────────────────┤       │
│  │ • query(sql, params)                                             │       │
│  │ • transaction(callback) - Handle BEGIN/COMMIT/ROLLBACK          │       │
│  │ • connect()    - Get client from pool                           │       │
│  │ • withLock()   - FOR UPDATE queries (optimistic locking)        │       │
│  │ • close()      - Drain pool                                      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PostgreSQL 15+                                                              │
│  ├─ Tables (BCNF normalized):                                               │
│  │  ├─ users, manufacturers, categories, products                           │
│  │  ├─ suppliers, customers, batches                                        │
│  │  ├─ stock_movements (immutable ledger)                                   │
│  │  ├─ purchase_invoices, purchase_invoice_items                            │
│  │  ├─ sale_invoices, sale_invoice_items                                    │
│  │  ├─ payments, expenses                                                    │
│  │  └─ supplier_ledger, customer_ledger (views)                             │
│  │                                                                           │
│  ├─ CONSTRAINTS & TRIGGERS:                                                 │
│  │  ├─ CHECK constraints (quantity >= 0, status finality)                   │
│  │  ├─ UNIQUE constraints (name, DRAP numbers)                              │
│  │  ├─ FK constraints (cascade on update)                                   │
│  │  ├─ Triggers: fn_sync_batch_quantity() - stock sync                      │
│  │  ├─ Triggers: fn_check_credit_limit() - credit validation                │
│  │  └─ Triggers: fn_rebuild_product_search_vector() - FTS                   │
│  │                                                                           │
│  └─ SEQUENCES:                                                              │
│     └─ sale_invoice_num_seq (gapless-ready invoicing)                       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

```

---

### 5.3 Component Descriptions

#### **Presentation Layer / UI**

**Responsibility**: Render user interface and collect user input; delegate business logic to application layer.

**Sub-Components**:

1. **Pages** (`/src/pages/`)
   - Top-level route components: `AddSale.jsx`, `Dashboard.jsx`, `Products.jsx`, etc.
   - Each page handles one major workflow (e.g., "Create a Sale", "View Stock")
   - Orchestrates child components and custom hooks
   - Does NOT contain business logic or raw Electron API calls

2. **Components** (`/src/components/`)
   - Reusable UI modules: `ActivityList`, `AnalyticsChart`, `Header`, `Sidebar`, `Dialogs`
   - Shared UI library: `avatar`, `button`, `card`, `table`, `dialog`, etc. (shadcn/ui-style)
   - Pure presentation logic; props-driven, no side effects
   - Example: `AnalyticsChart` receives data array, renders chart; doesn't fetch data

3. **Custom Hooks** (`/src/hooks/`)
   - **`useCustomerData.js`**: Fetches customer list, handles caching, refresh logic
   - **`useProductData.js`**: Fetches products, manages product filters
   - **`useSaleCart.js`**: Manages sale line items state (add, remove, update quantity)
   - **`useFormValidation.js`**: Validates forms in real-time (NTN, DRAP license, phone, etc.)
   - **`useElectronAPI.js`**: Abstracts Electron IPC calls (wraps `window.electronAPI`)
   - All hooks delegate to `apiAdapter` for actual data fetching (enabling testability)

4. **API Adapter** (`/src/services/apiAdapter.js`)
   - Single abstraction point for all backend communication
   - Exports interface: `{ customers, products, sales, purchases, ... }`
   - Implementation swappable: `ElectronApiAdapter` (uses IPC) vs. `HttpApiAdapter` (future REST)
   - Enables unit testing without Electron

---

#### **Application / IPC Handler Layer**

**Responsibility**: Route incoming IPC events from frontend to appropriate business services; validate input; format responses.

**Sub-Components**:

1. **IPC Handler Router** (`backend/handlers/ipcHandlers.js`)
   - Maps IPC channel names to service methods
   - ~100 lines total (vs. current 1500+ line monolith)
   - Example:
     ```javascript
     ipcMain.handle("add-sale", async (event, data) => {
       const validatedData = SaleDTO.validate(data);
       return ServiceResponse.success(await saleService.processSale(validatedData));
     });
     ```
   - Benefits: Easy to see all routes at a glance; isolated responsibility

2. **DTO & Validation Layer** (`backend/services/dtos/`)
   - **ProductDTO**: Validates product creation (name, manufacturer, GST rate, etc.)
   - **SaleDTO**: Validates sale invoice creation (customer, items, payment mode)
   - **CustomerDTO**: Validates customer creation (NTN, DRAP license, city, territory)
   - Uses Zod for schema validation (runtime safety)
   - Prevents invalid data from reaching business logic

3. **Response Handler** (`backend/services/responseHandler.js`)
   - Standardized response format across all handlers:
     ```javascript
     { success: true, data: {...}, error: null }
     { success: false, data: null, error: { message: "...", code: "..." } }
     ```
   - Improves frontend error handling consistency

---

#### **Domain / Business Logic Layer**

**Responsibility**: Implement core business rules, workflows, and calculations; orchestrate repositories; remain database-agnostic.

**Service Modules** (`/backend/services/`):

1. **`AuthService.js`**
   - `login(username, password)`: Verify credentials, return auth token
   - `signup(username, password, confirmPassword)`: Hash password, create user
   - `verifyToken(token)`: Validate JWT/session token
   - Does NOT touch database directly; uses `UserRepository`

2. **`ProductService.js`**
   - `listProducts(filters)`: Fetch active products, apply search/category filters
   - `createProduct(data)`: Insert product, trigger search vector rebuild
   - `updateProduct(id, data)`: Update product details
   - `deactivateProduct(id)`: Mark inactive (soft delete)
   - Depends on `ProductRepository` (interface, not concrete pool)

3. **`SaleService.js`** (Core transaction workflow)
   - `processSale(data)`: Main orchestrator
     - Validate customer credit limit
     - Lock batches (pessimistic locking)
     - Run FEFO allocation (via `AllocationStrategy`)
     - Insert invoice header + items
     - Record stock movements
     - Update aggregates
   - `confirmInvoice(id, userId)`: Transition from draft → confirmed
   - `validateCreditLimit(customerId, amount)`: Check customer balance
   - **Depends on**:
     - `SaleInvoiceRepository`
     - `BatchRepository`
     - `StockMovementRepository`
     - `AllocationStrategy` (polymorphic)
   - **Does NOT depend on**: PostgreSQL driver, IPC, Express—only on interfaces

4. **`PurchaseService.js`**
   - `createPurchaseOrder(data)`: Create PO (draft)
   - `confirmReceipt(id, data)`: Confirm GRN, create batches, record stock movements
   - `processReturn(invoiceId, items, reason)`: Handle purchase returns
   - Transactions handled via `DatabaseAdapter.transaction()`

5. **`StockService.js`**
   - `getAvailability(productId)`: Sum available quantity across all batches
   - `getExpiryStatus(productId)`: Alert on near-expiry stock
   - `calculateValuation(productId)`: FIFO/weighted-avg cost
   - Aggregation logic; uses `BatchRepository` and `StockMovementRepository`

6. **`LedgerService.js`**
   - `getSupplierLedger(supplierId, fromDate, toDate)`: All transactions with supplier
   - `getCustomerBalance(customerId)`: Current AR balance
   - `exportLedger(ledgerId, format)`: Export to CSV/PDF
   - Read-side queries; joins invoices, payments, stock movements

**Allocation Strategy Pattern** (Polymorphic):
- **Interface**: `AllocationStrategy`
  ```javascript
  interface AllocationStrategy {
    allocate(items, availableBatches): AllocationPlan[];
  }
  ```
- **Implementations**:
  - `FefoStrategy`: Expiry-first (current, via `calculateFefoPlan()`)
  - `FifoStrategy`: Receipt order
  - `WeightedAvgStrategy`: Cost-based allocation
- **Usage**: `SaleService` receives strategy via dependency injection
  ```javascript
  constructor(saleRepository, batchRepository, allocationStrategy) {
    this.strategy = allocationStrategy;  // Can be swapped
  }
  ```

**Pure Entities** (`/backend/entities/`):
- `Product`, `Batch`, `Customer`, `Supplier`
- Lightweight domain objects; minimal logic; mostly data + validation

---

#### **Data Access Layer (Repositories)**

**Responsibility**: Encapsulate all database queries; provide domain-oriented interface; hide SQL details.

**Repository Base Class** (`/backend/repositories/BaseRepository.js`):
```javascript
class BaseRepository {
  constructor(dbAdapter, tableName) {
    this.db = dbAdapter;
    this.tableName = tableName;
  }
  
  async getById(id) { /* SELECT ... WHERE id = $1 */ }
  async getAll(filters) { /* SELECT ... WHERE ...(filters) */ }
  async create(entity) { /* INSERT ... */ }
  async update(id, entity) { /* UPDATE ... */ }
  async delete(id) { /* DELETE ... (soft-delete) */ }
}
```

**Concrete Repositories**:

1. **`ProductRepository.js`**
   - Inherits: `getById()`, `getAll()`, `create()`, `update()`, `delete()`
   - Custom: `searchByName(term)`, `getByCategory(categoryId)`, `getActive()`, `rebuildSearchVector(productId)`

2. **`BatchRepository.js`**
   - Custom: `getActiveByProduct(productId)`, `getByExpiry(expiryRange)`, `lockForUpdate(productIds)` (FOR UPDATE)
   - Used in `SaleService` for FEFO calculations

3. **`SaleInvoiceRepository.js`**
   - Custom: `getByCustomer(customerId, status)`, `getByDateRange()`, `confirmInvoice(id, confirmData)`
   - Complex queries handled here (joins, aggregations)

4. **`StockMovementRepository.js`**
   - Immutable ledger; only `insert()` allowed
   - Custom: `getByBatch(batchId)`, `getByReference(referenceId, referenceType)`, `getMovementsSince(date)`

5. **`LedgerRepository.js`**
   - Aggregation queries:
     - `getSupplierLedger()`: Joins invoices + payments + stock movements
     - `getCustomerBalance()`: Running balance calculation

**Database Adapter** (`/backend/database/adapter.js`):
- Wraps PostgreSQL `Pool`
- Public interface:
  ```javascript
  async query(sql, params)          // Raw query
  async transaction(callback)       // Handle BEGIN/COMMIT/ROLLBACK
  async withLock(callback)          // FOR UPDATE wrapper
  async close()                      // Drain pool
  ```
- **Benefit**: Swap PostgreSQL for MongoDB/SQLite by creating new adapter; services unchanged

---

#### **Database Layer**

**Responsibility**: Persistent data storage; enforce constraints; maintain data integrity via triggers and checks.

**PostgreSQL 15+ Schema** (see [pharmax_schema.sql](database/pharmax_schema.sql)):

1. **Core Tables** (BCNF normalized):
   - `users` (authentication)
   - `manufacturers`, `categories`, `products` (master data)
   - `suppliers`, `customers`, `contacts` (parties)
   - `batches` (inventory units)
   - `stock_movements` (immutable ledger—source of truth for quantity)
   - `purchase_invoices`, `purchase_invoice_items` (GRN)
   - `sale_invoices`, `sale_invoice_items` (invoicing)
   - `payments`, `expenses` (financials)

2. **Constraint Strategy**:
   - **CHECK constraints**: `quantity_available >= 0`, `status = 'confirmed' → deactivated_at NOT NULL`
   - **UNIQUE constraints**: Product name, Manufacturer name, DRAP numbers
   - **FK constraints**: CASCADE on UPDATE, RESTRICT on DELETE (preserve audit trail)

3. **Trigger Functions**:
   - **`fn_sync_batch_quantity()`**: After each `stock_movement` INSERT, atomically update `batches.quantity_available`
     - Moves logic from application to database → race condition immunity
   - **`fn_check_credit_limit()`**: Before `sale_invoices` UPDATE to 'confirmed', validate customer AR balance
   - **`fn_rebuild_product_search_vector()`**: On product/manufacturer name update, regenerate full-text search vector

4. **Sequences**:
   - **`sale_invoice_num_seq`**: Gapless invoice numbering (format: `INV-2026-000001`)
   - Pre-seeded to prevent duplicates on restart

5. **Performance Features**:
   - Indexes on FK columns (product_id, customer_id, supplier_id, batch_id)
   - GiST index on `search_vector` (full-text search)
   - Partial indexes on `is_active = TRUE` (fast queries for active entities)

6. **Data Integrity Guarantees**:
   - All monetary values: `NUMERIC(15,2)` (never FLOAT → prevents rounding errors)
   - All timestamps: `TIMESTAMPTZ` (audit trail)
   - Soft deletes everywhere: `is_active + deactivated_at` (preserves history)
   - Append-only for financial records (no UPDATE/DELETE on ledger entries)

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

## Migration Path (Current → Recommended)

**Phase 1** (Week 1-2): Extract services from `main.js`
- Create `services/authService.js`, `productService.js`, `saleService.js`, etc.
- Move business logic from handlers into services

**Phase 2** (Week 2-3): Implement repository pattern
- Create `repositories/ProductRepository.js`, `BatchRepository.js`, etc.
- Replace direct `pool.query()` with repository methods

**Phase 3** (Week 3-4): Build API adapter for frontend
- Create `frontend/src/services/apiAdapter.js`
- Extract custom hooks from pages

**Phase 4** (Week 4-5): Refactor React components
- Extract logic into custom hooks
- Move state management to hooks

**Phase 5** (Week 5-6): Add DTO validation
- Implement Zod schemas for all input types
- Validate in IPC handlers before passing to services

**Result**: Testable, maintainable, enterprise-grade architecture.

