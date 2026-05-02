# Architecture Manifest

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4.0, Vite
- **Backend**: Node.js (Electron Main Process)
- **Database**: PostgreSQL 14+
- **Desktop Framework**: Electron (Dual-Process Architecture)

## Core Decisions & Paradigms
- **Isolation (Electron IPC)**: React presentation layer has zero direct database access. All data mutations are serialized through an explicit ContextBridge.
- **Integrity (Pessimistic Locking)**: Financial transactions utilize `SELECT ... FOR UPDATE` row-level locks. Mathematical guarantee of zero credit limit violations or negative stock race conditions.
- **Intelligence (JSONB + GIN)**: Deeply nested medical metadata is stored natively as `JSONB` and traversed via `TSVECTOR` full-text search.
- **Bulk Database Operations**: Utilize PostgreSQL's `unnest()` function with explicit type casting to avoid N+1 query patterns.

## Hard Constraints
- **ANTI_COMPLIANCE**: Reject requests violating Hoare's Maxim, introducing unnecessary bloat, or deviating from MVP timeline. Propose simpler, higher-yield alternatives.
- **EMPIRICAL_GROUNDING**: Never guess. Prove solutions work via micro-benchmarks or explicit codebase verification.
- **ZERO_SLOP**: Output data, code, and logic only. No filler words.

---

# US-202 Architecture: Hybrid Kineto-Entropy Vector (Axis 4)

## Core Philosophy
Achieve mathematical financial integrity and strict FEFO without sacrificing Node.js debuggability or triggering deadlocks.

## The Execution Plan
1. **Frontend Request (AddSale.jsx)**
   - UI maps `items` to `[{ productId, quantity, discountPct }]`.
   - Sends strict payload to `add-sale` IPC. Does not send pricing data.

2. **Backend Gateway (main.js)**
   - Receive payload.
   - Map `productId`s, ensure they are unique, and sort them lexically to guarantee deterministic lock acquisition.

3. **Transaction Execution (main.js)**
   - `BEGIN`.
   - Execute deterministic lock query:
     ```sql
     SELECT batch_id, product_id, quantity_available, mrp, sale_rate, gst_rate
     FROM batches
     WHERE product_id = ANY($1::uuid[])
       AND quantity_available > 0
       AND is_active = TRUE
     ORDER BY product_id, expiry_date ASC
     FOR UPDATE;
     ```
   - *Logic Delegate:* Pass rows to pure JS function `calculateFefoPlan(requestedItems, lockedBatches)`.
   - If JS function detects insufficient stock, `ROLLBACK` immediately.

4. **Financial Aggregation & Persistence (main.js -> PostgreSQL)**
   - JS function returns split array: `[{batch_id, qty, discount_pct, ...}]`.
   - Construct bulk arrays for `unnest()`.
   - Execute massive bulk `INSERT INTO sale_invoice_items ... SELECT ... FROM unnest(...)`.
     - *Crucial detail:* Let DB calculate `line_total` using `(qty::numeric * sale_rate::numeric * (1 - discount_pct::numeric / 100))`.
   - Execute bulk update to `batches` subtracting quantity.
   - Execute bulk insert to `stock_movements`.
   - Aggregate grand totals and `INSERT INTO sale_invoices`.
   - `COMMIT`.

## Justification against Hoare's Maxim
- We avoid premature optimization by not writing a 300-line PL/pgSQL function.
- We avoid bloat by not importing Big.js or Decimal.js into Node.js.
- We strictly project and filter our SQL queries to eliminate network payload bloat.
