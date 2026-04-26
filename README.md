<div align="center">
  <h1>💊 PharmaX</h1>
  <p><strong>Industrial-Grade Pharmaceutical Billing & Inventory Hub</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Electron-37-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
    <img src="https://img.shields.io/badge/PostgreSQL-15+-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  </p>
</div>

## 🌐 System Architecture: The 3-Pillar Rationale

PharmaX guarantees absolute financial integrity using a strict separation of concerns, orchestrated through a **Dual-Process Architecture**.

1. **Isolation (Electron IPC)**: The React presentation layer has zero direct database access. All data mutations are serialized through an explicit ContextBridge, neutralizing SQL injection vectors at the OS level.
2. **Integrity (Pessimistic Locking)**: Financial transactions utilize `SELECT ... FOR UPDATE` row-level locks. This active throughput sacrifice mathematically guarantees zero credit limit violations or negative stock race conditions.
3. **Intelligence (JSONB + GIN)**: Deeply nested medical metadata is stored natively as `JSONB` and traversed via `TSVECTOR` full-text search, yielding NoSQL-like query speeds on a purely relational engine.

> **Deep Dive Tutorials:** To fully grok the "Why" and the "Black Swan" tradeoffs of this architecture, collaborators must review the **[Docs/Tutorials Learning Series](Docs/Tutorial/)**.

---

## ⚡ Quick Start (Zero-Friction Onboarding)

Ensure **PostgreSQL 14+** and **Node.js 20+** are running on your host.

### 1. Database Initialization
```bash
# Apply the industrial schema
psql -U postgres -f database/pharmax_schema.sql
```
*(Copy `.env.example` to `Backend/app/.env` and update `DATABASE_URL`)*

### 2. Launching the Dual-Process Harness
```bash
# Shell 1: Frontend (Renderer)
cd Frontend
npm install
npm start

# Shell 2: Backend (Main) is built/managed via Electron Forge simultaneously through the Frontend npm script.
# For specific debug tracing:
# DEBUG=electron-forge:* npm start
```

---

## 📈 Progress Report (Iteration 1 & 2)

### Iteration 1 (Sprint 1) - Complete ~~[Done]~~
- ~~**US-101** - System Authentication (Register, Login, Role-based redirect)~~
- ~~**US-102** - Add / Manage Products (Medicine master, DRAP scheduling, FBR GST rate)~~
- ~~**US-103** - Add / Manage Suppliers (STRN, NTN, DRAP drug licence)~~
- ~~**US-104** - Add / Manage Customers (Credit limits, territory)~~
- ~~**US-105** - Add / Manage Batches (MRP enforced, expiry info)~~
- ~~**US-106** - View Current Stock Levels (Stock summary, search, filter)~~

### Iteration 2 (Sprint 2) - In Progress
- ~~**US-201** - Create Purchase Invoice (GRN)~~  *(Implemented: `Frontend/src/pages/Purchaseinvoice.jsx`)*
- ~~**US-202** - Generate Sales Invoice with GST~~ *(Implemented: `Frontend/src/pages/AddSale.jsx`)*

#### 🎯 Remaining User Stories to Implement:

- **US-203** - Record Purchase Returns
  - **Goal:** Return to suppliers; adjust stock and payables.
  - **Targets:** `PurchaseReturn.jsx`, `App.jsx` (route), `add-purchase-return` IPC in `main.js`.
- **US-204** - Process Sales Returns
  - **Goal:** Process customer returns; restore batch stock, update customer ledger.
  - **Targets:** `SalesReturn.jsx`, `App.jsx` (route), `add-sales-return` IPC.
- **US-205** - Near-Expiry Batch Alerts
  - **Goal:** Dashboard warnings for 30, 60, 90-day expiries.
  - **Targets:** `ExpiryAlerts.jsx`, update `Dashboard.jsx`, modify `get-near-expiry` IPC.
- **US-206** - View Customer Ledger & Outstanding Dues
  - **Goal:** Running account with ageing analysis and credit checks.
  - **Targets:** `CustomerLedger.jsx`, `get-customer-ledger` IPC.
- **US-207** - View Supplier Ledger & Outstanding Payables
  - **Goal:** Running account with outstanding payables and date filters.
  - **Targets:** `SupplierLedger.jsx`, `get-supplier-ledger` IPC.

---

## 🗄️ Database ERD Reference

![Pharmacy Billing App ERD](database/ERD.png)
