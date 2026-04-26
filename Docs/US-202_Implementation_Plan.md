# US-202 Implementation Plan: Generate Sales Invoice with GST & FEFO

## 1. What are we building?
**User Story 202:** Generate Sales Invoice with GST.
- **US-202a:** Create a sales invoice with **FEFO (First-Expire-First-Out)** batch auto-selection per product line.
- **US-202b:** Apply schemes/discounts, compute GST automatically, and deduct stock upon saving.

We are building the critical "Checkout" flow of the pharmacy. The user selects a product and specifies a quantity (e.g., 150 tablets of Panadol). The system must automatically figure out *which* specific batches of Panadol to take those 150 tablets from, prioritizing batches that expire the soonest (FEFO). It then calculates the exact tax, applies discounts, locks the inventory, deducts the stock, and records the final financial invoice.

## 2. Why are we building it this way?
In a high-throughput pharmacy, the cashier does not have time to manually select specific batches for every item. The system must enforce FEFO to minimize inventory spoilage.

Furthermore, financial calculations (GST, Discounts, Line Totals) must be perfectly accurate and immune to floating-point rounding errors. Finally, the inventory deduction must be transactionally safe—if two cashiers sell the same last box of medicine at the exact same millisecond, one transaction must succeed and the other must gracefully fail, preventing negative stock.

## 3. Thoughts, Reasoning & Tradeoffs (Avoiding Hoare's Maxim)

### Challenge A: The FEFO Allocation Algorithm
**Where should the allocation happen?**
- **Option 1: Frontend Allocation.** Send all batch data to React, run the FEFO math in JS, and send the specific batch IDs back to the backend.
  - *Tradeoff:* Prone to race conditions. By the time the frontend calculates the split, the stock might have changed. It requires sending too much data over IPC.
- **Option 2: Pure SQL Allocation.** Write a massive recursive CTE (Common Table Expression) or stored procedure that dynamically deducts and inserts rows.
  - *Tradeoff:* Extremely brittle, hard to debug, and violates the "Premature Optimization" maxim.
- **Option 3: Backend Node.js Allocation (The Chosen Path).**
  - *Reasoning:* The React frontend just says `[{ productId: 'abc', qty: 150 }]`. The Node.js Main process opens a `BEGIN TRANSACTION`, queries available batches ordered by `expiry_date ASC`, iterates through them in JS logic to fulfill the 150 count, and then executes precise `UPDATE` statements using the locked rows.
  - *Why this avoids Hoare's Maxim:* It keeps the SQL simple (`SELECT FOR UPDATE` and simple `UPDATE` statements) while leveraging Node.js for the complex iteration logic. It is infinitely easier to test and debug than a monolithic SQL CTE.

### Challenge B: Precision Financial Math
**How do we handle decimals?**
JavaScript uses IEEE 754 floating-point numbers. `0.1 + 0.2 === 0.30000000000000004`. If we calculate GST and discounts in native JS floats, we will eventually generate invoices that are off by a penny, breaking financial reconciliation.
- *Reasoning:* We will perform all calculations in PostgreSQL using the `NUMERIC` data type, OR we will use a specialized library (or simple integer math: converting everything to cents/paisas before multiplying) in Node.js.
- *Iterative Refinement:* To keep it simple initially, we will perform the math in Node.js by converting values to integers (e.g., `amount * 100`) for the calculation, and converting back before inserting into Postgres's `NUMERIC` columns.

### Challenge C: Transactional Locking (Pessimistic vs Optimistic)
- *Tradeoff:* Optimistic locking (checking a `version` column) is faster for reads but requires complex retry logic in the UI when collisions happen.
- *Reasoning:* We will stick to the architecture's core pillar: **Pessimistic Locking**. We will use `SELECT ... FOR UPDATE` on the batches.
- *Iterative Refinement to avoid Deadlocks:* If an invoice has multiple products, the Node.js backend MUST sort the `product_id`s or `batch_id`s before requesting the locks. If Cashier A locks Product 1 then Product 2, and Cashier B locks Product 2 then Product 1, the database will deadlock. Sorting guarantees a consistent lock acquisition order.

## 4. Step-by-Step Implementation Strategy

1. **Frontend Request (The "What"):**
   - React UI collects: `customer_id`, `discount_amount`, and an array of `items: [{ product_id, requested_quantity }]`.
   - Fires IPC: `window.electronAPI.addSale(payload)`.

2. **Backend Transaction Initiation (The "Why: Integrity"):**
   - Node.js starts `BEGIN TRANSACTION`.

3. **FEFO Allocation & Locking (The "Reasoning: Simplicity & Safety"):**
   - Iterate over the requested items (sorted by `product_id` to prevent deadlocks).
   - Query: `SELECT batch_id, quantity_available, mrp, sale_rate, gst_rate FROM batches WHERE product_id = $1 AND quantity_available > 0 ORDER BY expiry_date ASC FOR UPDATE`.
   - *Logic:* Loop through the returned rows. If Batch 1 has 100, take 100. Need 50 more? Move to Batch 2. If total available across all batches is < requested, `ROLLBACK` and throw an "Insufficient Stock" error.

4. **Financial Calculation & Insertion (The "Precision"):**
   - For each allocated batch split, compute the `line_total` and `tax_amount` using integer-based math.
   - Insert into `sale_invoice_items`.
   - Update `batches` (reduce `quantity_available`).
   - Insert into `stock_movements` (audit trail).

5. **Finalization:**
   - Aggregate totals. Insert the parent record into `sale_invoices`.
   - `COMMIT`.
   - Return the generated `invoice_number` to the React UI for receipt printing.
