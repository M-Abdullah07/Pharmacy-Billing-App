# PharmaX Architecture Documentation

## 1. System Overview

PharmaX is a comprehensive Pharmacy Billing and Inventory Management System designed for efficiency, security, and scalability. It is built as a **cross-platform desktop application** using the Electron framework, catering to the specific needs of pharmaceutical retail and wholesale business flows (DRAP regulations, batch tracking, expiry management).

### 1.1 Core Objectives
- **Inventory Precision**: Real-time tracking of stock levels at the batch level.
- **Regulatory Compliance**: Tracking DRAP manufacturing licenses, STRN, and NTN for suppliers and manufacturers.
- **High Performance**: Low-latency data operations via a local PostgreSQL instance.
- **Security**: Robust authentication using Argon2 hashing and transactional integrity.

---

## 2. Technology Stack

The system follows a decoupled architecture within the Electron environment, separating the presentation layer from the business and data access layers.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Electron 37 | Native desktop wrapper and system-level integration. |
| **Frontend (Renderer)** | React 19 + Vite | Component-based UI with fast development feedback. |
| **Styling** | Tailwind CSS 4 + Shadcn UI | Utility-first responsive design and consistent UI components. |
| **Backend (Main Process)** | Node.js | Business logic, IPC handling, and database connection. |
| **Database** | PostgreSQL | Relational data persistence with strict schema enforcement. |
| **Security** | Argon2 | Industry-standard password hashing and security. |
| **icons** | Lucide React | High-quality, consistent iconography. |

---

## 4. Data Flow & IPC Communication

Communication between the Renderer (UI) and Main (Logic) processes is handled via Electron's **Inter-Process Communication (IPC)**.

### 4.1 Request-Response Cycle
1.  **Renderer**: Invokes an event (e.g., `window.ipcRenderer.invoke('get-products')`).
2.  **Preload**: Acts as a secure gateway, exposing only specific IPC channels to the renderer.
3.  **Main Process**: Listens for the event, executes Node.js logic (database query, hashing, etc.), and returns a Promise.
4.  **Renderer**: Receives the result and updates the React state.

### 4.2 Key IPC Channels
- `query-db` / `run-db`: Generic channels for raw SQL execution (used sparingly).
- `auth`: `login-user`, `signup-user` (uses argon2).
- `master-data`: `get-manufacturers`, `add-product`, `get-suppliers`, etc.
- `inventory`: `get-batches`, `add-batch`, `get-stock-summary`.

---

## 5. Database Architecture (PostgreSQL)

The system utilizes a relational schema optimized for high integrity and regulatory compliance.

### 5.1 Design Principles
- **Soft Deletion**: Records are rarely deleted; instead, they are deactivated (`is_active = FALSE`) to preserve historical audit trails.
- **Append-Only Ledgers**: Financial and stock movement tables are insert-only to ensure immutability.
- **Transactional Integrity**: Complex operations (like confirming an invoice) are wrapped in PostgreSQL transactions.

### 5.2 Key Entities
- **Users**: Authentication and basic authorization.
- **Products & Batches**: Hierarchical stock management. Products define the "what," while batches define the "which" (expiry, MRP).
- **Manufacturers & Suppliers**: Regulatory entities tracking DRAP licenses and tax identifiers (STRN/NTN).
- **Stock Movements**: The authoritative ledger for every single unit of medicine entering or leaving the system.

### 5.3 Advanced Features
- **Full-Text Search**: Optimized via `TSVECTOR` and `GIN` indexes for instant search across thousands of products.
- **Triggers**: Automate stock level updates and search vector maintenance at the database level.
- **Enums**: Strict enforcement of domain values (e.g., `drug_schedule`, `movement_type`).

---

## 6. Security Implementation

- **Password Security**: Argon2id hashing is used for all user passwords.
- **Login Protection**: Implementing failed attempt tracking and temporary account locking (15-minute lock after 5 failures).
- **Database Safety**: Parameterized queries are used universally to prevent SQL Injection.
- **Process Isolation**: The renderer process has no direct access to Node.js APIs or the database, adhering to Electron's security best practices.
