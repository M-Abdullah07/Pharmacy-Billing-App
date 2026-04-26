# Lesson 02: Transaction Integrity & Ledgering

## 1. The 'Why': Financial Immutability
In pharmaceutical distribution, "eventual consistency" is unacceptable. Selling a medicine batch that has already been depleted, or violating a customer's credit limit due to a race condition, are critical compliance failures. The database must act as a fortress of immediate consistency.

## 2. The 'How': Pessimistic Locking & Append-Only Ledgers
PharmaX utilizes explicit **Pessimistic Locking** (`SELECT ... FOR UPDATE`) within ACID transactions. When a sale is processed, the specific batch row is locked. Concurrent transactions attempting to sell the same batch are queued until the first transaction commits.

Additionally, financial and stock state isn't just updated; it is recorded via **Append-Only Ledgers** (e.g., `stock_movements`, `payments`).

```sql
-- Architectural Pattern: The Integrity Lock
BEGIN TRANSACTION;

-- 1. Lock Customer to prevent credit limit bypass
SELECT credit_limit, balance_due FROM customers WHERE customer_id = $1 FOR UPDATE;

-- 2. Lock Batch to prevent negative stock
SELECT quantity_available FROM batches WHERE batch_id = $2 FOR UPDATE;

-- 3. Execute State Mutations
UPDATE batches SET quantity_available = quantity_available - $3;
INSERT INTO stock_movements (batch_id, quantity) VALUES ($2, -$3);

COMMIT;
```

## 3. The Tradeoffs & Black Swan Vulnerabilities
**Tradeoff:** Concurrency throughput is bottlenecked. Two pharmacists selling from the identical batch simultaneously will experience lock contention, causing a measurable latency spike for the second user.

**Black Swan Failure Mode: Deadlock Cascades**
Transaction A locks Batch 1, then attempts to lock Batch 2.
Transaction B locks Batch 2, then attempts to lock Batch 1.
Result: Deadlock. PostgreSQL will arbitrarily kill one transaction. If bulk import scripts hit this, entire cohorts of data ingestion will fail catastrophically.

### 4. Hardening & Rectification
- **Deterministic Lock Ordering:** Always lock rows in a globally consistent order. Before executing `SELECT FOR UPDATE`, the application layer MUST sort the IDs (e.g., alphabetically by UUID). This mathematically eliminates circular deadlocks.
- **Lock Timeouts:** Configure `lock_timeout` at the transaction level so blocked queries fail fast rather than hanging the Electron Node process indefinitely.
- **Bulk Optimization (`unnest`):** Instead of N+1 queries during bulk operations, pass arrays from Node.js and use `unnest()` to lock multiple rows in a single atomic SQL statement.
