# Pharmacy Billing App

## Description

A comprehensive and top-tier pharmaceutical billing, inventory sharing, and patient tracking system built on modern architectural principles. This system guarantees financial integrity using pessimistic locking, JSONB indexes, and robust Electron inter-process communication—all backed by an industrial-grade PostgreSQL schema tailored for zero-collision concurrency.

## Team Members

| Team Member  | Roll No. |
| :----------- | :------- |
| Sheraz Malik | 23L-0572 |
| Ali Hasan    | 23L-0690 |
| M.Abdullah   | 23L-0505 |

## Tech Stack

- **Backend**: Node.js (Electron Main Process)
- **Frontend**: React (Vite, Electron Renderer & Shadcn/Radix Primitives)
- **Database**: PostgreSQL

---

## 🏗️ Architecture Overview

The application features a secure and modern dual-process desktop architecture:

### 1. Dual-Process Electron Pattern

- **Main Process (`Backend/app/`)**: Handles native OS capabilities, deep PostgreSQL connections, and manages the secure window sandbox.
- **Renderer Process (`Frontend/`)**: A fast, Vite-bundled React Single Page Application handling the interactive UI and forms.
- **IPC (Inter-Process Communication)**: Ensures strict API boundaries so the frontend cannot execute arbitrary queries, neutralizing SQL injection vectors.

### 2. High-Integrity PostgreSQL Database

- **Credit Race Condition Guards**: Transactions utilize pessimistic locking (`SELECT ... FOR UPDATE`) to guarantee zero balance limits aren't violated.
- **Metadata Performance**: Clinical data models utilize `.jsonb` columns backed by `GIN` indexes, creating a NoSQL-like search speed inside a relational system.
- **Collision-Free Invoicing**: Strict sequences ensure continuous and scalable sequential identifiers for financial tracking.

---

## 🗄️ Database ERD

_The database topology for the application is designed comprehensively around financial transactions, medicine inventory, and patient tracking:_

![Pharmacy Billing App ERD](database/ERD.png)

### 📊 Interactive Schema

```mermaid
erDiagram
    users {
        UUID user_id PK
        TEXT username
        TEXT password_hash
        BOOLEAN is_active
        TIMESTAMPTZ last_login_at
        SMALLINT failed_attempts
        TIMESTAMPTZ locked_until
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    manufacturers {
        UUID manufacturer_id PK
        TEXT name
        TEXT drap_mfg_licence
        TEXT country
        TEXT contact_number
        TEXT email
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    categories {
        UUID category_id PK
        TEXT name
        TEXT description
        BOOLEAN is_active
    }

    products {
        UUID product_id PK
        UUID manufacturer_id FK
        UUID category_id FK
        TEXT name
        TEXT form
        TEXT uom
        SMALLINT quantity_in_uom
        TEXT hsn_code
        NUMERIC gst_rate
        drug_schedule drug_schedule
        TEXT drap_registration_no
        BOOLEAN requires_prescription
        TEXT generic_formula
        NUMERIC default_sale_rate
        NUMERIC default_purchase_rate
        TEXT shelf_no
        JSONB attributes
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    product_price_history {
        UUID history_id PK
        UUID product_id FK
        UUID changed_by FK
        NUMERIC default_sale_rate
        NUMERIC default_purchase_rate
        TIMESTAMPTZ effective_from
        TEXT notes
    }

    suppliers {
        UUID supplier_id PK
        TEXT name
        TEXT strn
        TEXT ntn
        TEXT drug_licence_no
        TEXT address
        TEXT city
        TEXT payment_terms
        SMALLINT credit_period_days
        NUMERIC opening_balance
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    customers {
        UUID customer_id PK
        TEXT name
        TEXT strn
        TEXT ntn
        TEXT drug_licence_no
        TEXT address
        TEXT city
        TEXT territory
        customer_type customer_type
        NUMERIC credit_limit
        NUMERIC opening_balance
        TEXT payment_terms
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    contact_persons {
        UUID contact_id PK
        contact_entity entity_type
        UUID entity_id
        TEXT name
        TEXT role
        TEXT contact_number
        TEXT email
        BOOLEAN is_primary
        TIMESTAMPTZ created_at
    }

    purchase_invoices {
        UUID purchase_invoice_id PK
        UUID supplier_id FK
        TEXT invoice_number
        DATE invoice_date
        DATE received_date
        invoice_status status
        NUMERIC subtotal
        NUMERIC discount_amount
        NUMERIC tax_amount
        NUMERIC net_payable
        TEXT notes
        UUID created_by FK
        UUID confirmed_by FK
        TIMESTAMPTZ confirmed_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    purchase_invoice_items {
        UUID item_id PK
        UUID purchase_invoice_id FK
        UUID product_id FK
        TEXT batch_number
        DATE manufacturing_date
        DATE expiry_date
        NUMERIC mrp
        NUMERIC purchase_cost_per_unit
        INTEGER quantity
        NUMERIC discount_pct
        NUMERIC gst_rate
        NUMERIC line_total
        NUMERIC tax_amount
    }

    batches {
        UUID batch_id PK
        UUID product_id FK
        UUID supplier_id FK
        UUID purchase_invoice_id FK
        TEXT batch_number
        DATE manufacturing_date
        DATE expiry_date
        NUMERIC mrp
        NUMERIC purchase_cost_per_unit
        INTEGER quantity_received
        INTEGER quantity_available
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    stock_movements {
        UUID movement_id PK
        UUID batch_id FK
        movement_type movement_type
        INTEGER quantity
        TEXT reference_type
        UUID reference_id
        TEXT notes
        UUID created_by FK
        TIMESTAMPTZ created_at
    }

    sale_invoices {
        UUID sale_invoice_id PK
        TEXT invoice_number
        UUID customer_id FK
        DATE invoice_date
        DATE due_date
        invoice_status status
        NUMERIC subtotal
        NUMERIC discount_amount
        NUMERIC tax_amount
        NUMERIC net_receivable
        NUMERIC amount_paid
        NUMERIC balance_due
        TEXT notes
        UUID created_by FK
        UUID confirmed_by FK
        TIMESTAMPTZ confirmed_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    sale_invoice_items {
        UUID item_id PK
        UUID sale_invoice_id FK
        UUID product_id FK
        UUID batch_id FK
        INTEGER quantity
        NUMERIC mrp
        NUMERIC sale_rate
        NUMERIC discount_pct
        NUMERIC gst_rate
        NUMERIC line_total
        NUMERIC tax_amount
    }

    purchase_returns {
        UUID return_id PK
        UUID purchase_invoice_id FK
        UUID supplier_id FK
        DATE return_date
        return_reason reason
        TEXT notes
        NUMERIC total_credit
        invoice_status status
        UUID created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    purchase_return_items {
        UUID item_id PK
        UUID return_id FK
        UUID batch_id FK
        INTEGER quantity
        NUMERIC credit_rate
        NUMERIC line_credit
    }

    sale_returns {
        UUID return_id PK
        UUID sale_invoice_id FK
        UUID customer_id FK
        DATE return_date
        return_reason reason
        TEXT notes
        NUMERIC total_credit
        invoice_status status
        UUID created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    sale_return_items {
        UUID item_id PK
        UUID return_id FK
        UUID batch_id FK
        INTEGER quantity
        NUMERIC credit_rate
        NUMERIC line_credit
    }

    payments {
        UUID payment_id PK
        payment_direction direction
        UUID party_id
        DATE payment_date
        NUMERIC amount
        payment_mode mode
        TEXT reference_no
        TEXT bank_name
        TEXT notes
        UUID created_by FK
        TIMESTAMPTZ created_at
    }

    expenses {
        UUID expense_id PK
        DATE expense_date
        expense_category category
        TEXT description
        NUMERIC amount
        payment_mode mode
        TEXT reference_no
        TEXT vendor_name
        UUID created_by FK
        TIMESTAMPTZ created_at
    }

    %% ── Relationships ──────────────────────────────────────────
    manufacturers ||--o{ products : "manufactures"
    categories ||--o{ products : "classifies"
    products ||--o{ product_price_history : "tracks price of"
    users ||--o{ product_price_history : "changed by"

    suppliers ||--o{ purchase_invoices : "supplies via"
    users ||--o{ purchase_invoices : "created / confirmed by"
    purchase_invoices ||--o{ purchase_invoice_items : "contains"
    products ||--o{ purchase_invoice_items : "line item for"

    products ||--o{ batches : "stocked as"
    suppliers ||--o{ batches : "sourced from"
    purchase_invoices ||--o{ batches : "received on"

    batches ||--o{ stock_movements : "tracks movement of"
    users ||--o{ stock_movements : "recorded by"

    customers ||--o{ sale_invoices : "billed to"
    users ||--o{ sale_invoices : "created / confirmed by"
    sale_invoices ||--o{ sale_invoice_items : "contains"
    products ||--o{ sale_invoice_items : "line item for"
    batches ||--o{ sale_invoice_items : "dispatched from"

    purchase_invoices ||--o{ purchase_returns : "returned against"
    suppliers ||--o{ purchase_returns : "credited to"
    purchase_returns ||--o{ purchase_return_items : "contains"
    batches ||--o{ purchase_return_items : "returned batch"

    sale_invoices ||--o{ sale_returns : "returned against"
    customers ||--o{ sale_returns : "credited to"
    sale_returns ||--o{ sale_return_items : "contains"
    batches ||--o{ sale_return_items : "returned batch"

    users ||--o{ payments : "recorded by"
    users ||--o{ expenses : "recorded by"
```


## 📈 Progress Report (Iteration 1 & 2)

### Iteration 1 (Sprint 1) - Complete ~~[Done]~~
- ~~**US-101** - System Authentication (Register, Login, Role-based redirect)~~
- ~~**US-102** - Add / Manage Products (Medicine master, DRAP scheduling, FBR GST rate)~~
- ~~**US-103** - Add / Manage Suppliers (STRN, NTN, DRAP drug licence)~~
- ~~**US-104** - Add / Manage Customers (Credit limits, territory)~~
- ~~**US-105** - Add / Manage Batches (MRP enforced, expiry info)~~
- ~~**US-106** - View Current Stock Levels (Stock summary, search, filter)~~

### Iteration 2 (Sprint 2) - In Progress
- ~~**US-201** - Create Purchase Invoice (GRN)~~
  - *Status:* Implemented (`Frontend/src/pages/Purchaseinvoice.jsx`, `add-purchase-invoice` IPC)
- ~~**US-202** - Generate Sales Invoice with GST~~
  - *Status:* Implemented (`Frontend/src/pages/AddSale.jsx`, `add-sale` IPC)

#### Remaining User Stories to Implement:

- **US-203** - Record Purchase Returns
  - **Description:** Record returns to suppliers, specifying batch and quantity returned, and automatically adjust stock and supplier payables.
  - **Sub-Stories:**
    - US-203a: Record return against a purchase invoice, specify batch and quantity returned.
    - US-203b: Adjust stock and supplier payable automatically on return save.
  - **Files to consider:**
    - `Frontend/src/pages/PurchaseReturn.jsx` (New)
    - `Frontend/src/App.jsx` (Add route)
    - `Backend/app/main.js` (Add `add-purchase-return` IPC)

- **US-204** - Process Sales Returns
  - **Description:** Process customer returns against a sales invoice, restore batch stock, and update the customer ledger account.
  - **Sub-Stories:**
    - US-204a: Process sales return against a sales invoice and credit the customer account.
    - US-204b: Restore batch stock on sales return and update customer ledger.
  - **Files to consider:**
    - `Frontend/src/pages/SalesReturn.jsx` (New)
    - `Frontend/src/App.jsx` (Add route)
    - `Backend/app/main.js` (Add `add-sales-return` IPC)

- **US-205** - Near-Expiry Batch Alerts
  - **Description:** Automated dashboard warnings for batches expiring within 30, 60, and 90 days.
  - **Sub-Stories:**
    - US-205a: Show dashboard alert for batches expiring within 30 days (Critical).
    - US-205b: Show warning for batches 31-60 days from expiry; block sale of expired batches.
  - **Files to consider:**
    - `Frontend/src/pages/Dashboard.jsx` (Modify to fetch/display alerts)
    - `Frontend/src/components/ui/ExpiryAlerts.jsx` (New)
    - `Backend/app/main.js` (Modify `get-near-expiry` IPC if needed)

- **US-206** - View Customer Ledger & Outstanding Dues
  - **Description:** Real-time account view per customer including dues, ageing analysis (0-30, 31-60, etc.), and credit limit status.
  - **Sub-Stories:**
    - US-206a: View running account per customer with sales, returns, payments, and balance.
    - US-206b: Show ageing analysis (0-30, 31-60, 61-90, 90+ days overdue) and credit limit status.
  - **Files to consider:**
    - `Frontend/src/pages/CustomerLedger.jsx` (New) or `CreditDues.jsx` (Modify)
    - `Backend/app/main.js` (Add `get-customer-ledger` IPC)

- **US-207** - View Supplier Ledger & Outstanding Payables
  - **Description:** Real-time account view per supplier with outstanding payables, payment history, and reconciliation.
  - **Sub-Stories:**
    - US-207a: View running account per supplier with purchases, returns, payments made, and balance.
    - US-207b: Filter supplier ledger by date range and export outstanding payables list.
  - **Files to consider:**
    - `Frontend/src/pages/SupplierLedger.jsx` (New)
    - `Backend/app/main.js` (Add `get-supplier-ledger` IPC)


## 🚀 How to Run

### Database

1. Make sure you have **PostgreSQL 14+** running locally.
2. Initialize the database schema:
   ```bash
   psql -U postgres -f database/pharmax_schema.sql
   ```
3. Copy `.env.example` (if exists) to `Backend/app/.env` holding your local `DATABASE_URL`.

### Backend (Node.js/Electron Main)

_Note: In Electron via Forge, building the main process is often handled simultaneously by the frontend bundler, but if independent:_

```bash
cd Backend/app
npm install
```

### Frontend (React/Electron Shell)

Starts the entire desktop application by launching the Vite development server paired with the Electron harness:

```bash
cd Frontend
npm install
npm start
```

---


## 📘 Comprehensive Architecture Tutorial

PharmaX features a modern, secure dual-process Electron architecture backed by an industrial-grade PostgreSQL database.

**Quick Overview:**
- **What it is:** A desktop application combining Node.js native capabilities with a fast React frontend, connected to a robust PostgreSQL database.
- **Why we built it this way:** To provide a responsive, offline-capable application that guarantees financial integrity (using PostgreSQL locking) while maintaining strict security boundaries (preventing SQL injection from the frontend).
- **How it works:** The React frontend (Renderer) captures user input and sends messages via Inter-Process Communication (IPC) to the Node.js backend (Main Process). The Main Process safely executes database queries and returns the results.

For a full, deep-dive tutorial complete with codebase snippets, architectural choices, and visual diagrams, please read the [Comprehensive PharmaX Tutorial & Deep Dive](Docs/TUTORIAL.md).


## 🛠️ Testing & Quality

- **TypeScript / React 19 Patterns**: Stale closures inside `useEffect` and anti-patterns like `dangerouslySetInnerHTML` are strictly forbidden. Hooks follow strict dependency arrays, and components are efficiently memoized.
- **SQL Linters**: Schema triggers, procedures, and logic flows adhere to official GitHub PostgreSQL guidelines.
- **Security Scans**: The architecture conforms to SOLID boundaries, preserving separation of concerns across the Node.js API layer.

## 🚑 Troubleshooting

- **`could not connect to server: Connection refused`**: Start your PostgreSQL daemon (`pg_ctl start` or system services).
- **`Vite Build failed` / `Electron Not Starting`**: Run `rm -rf node_modules/.vite` to purge the bundler cache and re-run `npm install`.
