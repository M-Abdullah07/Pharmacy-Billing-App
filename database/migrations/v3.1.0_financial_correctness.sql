-- ============================================================
-- PHARMAX MIGRATION: V3.0.1 -> V3.1.0 (Financial Correctness / P1)
-- ============================================================
-- Purpose: Fixes accounts-payable tracking, ledger fan-out bugs, and
--          AR ageing so per-invoice balances and dashboard/ledger
--          reports are numerically correct.
--
-- TARGET : production
-- DATE   : 2026-07-05
-- IDEMPOTENT: Yes — safe to run multiple times. Uses IF NOT EXISTS /
--             CREATE OR REPLACE throughout, and the amount_paid
--             backfill is a no-op after the first run (WHERE clause
--             only touches un-backfilled rows).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. M1: Supplier payment allocation columns on purchase_invoices
-- ------------------------------------------------------------
-- Mirrors sale_invoices.amount_paid / balance_due so record-supplier-payment
-- can do real FIFO allocation instead of leaving purchase_invoices untouched.
-- Default 0 is the correct backfill: any historical 'paid' payments already
-- reduce suppliers.opening_balance/outstanding_payable via v_supplier_ap,
-- and at the time of writing this migration there are no rows in
-- payments WHERE direction = 'paid' — so a 0 backfill loses no information.
ALTER TABLE purchase_invoices
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0);

-- balance_due as a GENERATED column requires net_payable to already exist
-- (it does) and needs to be added only if missing.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_invoices' AND column_name = 'balance_due'
    ) THEN
        ALTER TABLE purchase_invoices
            ADD COLUMN balance_due NUMERIC(15,2) GENERATED ALWAYS AS (net_payable - amount_paid) STORED;
    END IF;
END $$;

-- Guard: amount_paid can never exceed net_payable (mirrors chk_sale_invoice_payment).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_invoice_payment'
    ) THEN
        ALTER TABLE purchase_invoices
            ADD CONSTRAINT chk_purchase_invoice_payment CHECK (amount_paid <= net_payable);
    END IF;
END $$;

-- Backfill: for already-confirmed invoices with no allocation history, amount_paid
-- stays at its default (0) — there is nothing to backfill against because no
-- 'paid' payments existed before this migration. This UPDATE is a documented
-- no-op guard in case the migration runs after payments have since been added
-- and re-run is needed; it only ever narrows amount_paid up to net_payable and
-- never below 0, so it is safe to re-run.
UPDATE purchase_invoices
SET amount_paid = LEAST(amount_paid, net_payable)
WHERE amount_paid > net_payable;

-- Fast lookup for FIFO allocation query (oldest unpaid invoice first per supplier).
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_balance
    ON purchase_invoices (supplier_id, invoice_date, created_at)
    WHERE status = 'confirmed';


-- ------------------------------------------------------------
-- 2. C4/H7: Fix fan-out (row-multiplication) in v_customer_ar / v_supplier_ap
-- ------------------------------------------------------------
-- BEFORE: LEFT JOIN sale_invoices si ... LEFT JOIN payments p ... in the SAME
-- query produces a cross join between a customer's invoices and their
-- payments (N invoices x M payments rows), inflating both SUM(si.*) and
-- SUM(p.amount) by a multiplicative factor. Fix: aggregate invoices and
-- payments in separate CTEs first, then join the two pre-aggregated
-- single-row-per-party results.
--
-- M18: AR ageing buckets must age each UNPAID invoice individually by its
-- own due_date relative to CURRENT_DATE, then sum the bucketed balance_due
-- per customer — NOT bucket the customer's lumped total. The invoice-level
-- FILTER clauses already did this correctly in the original view; the fix
-- here keeps that per-invoice bucketing intact while removing the fan-out
-- that was inflating bucket sums by the payment-row multiplier.

CREATE OR REPLACE VIEW v_customer_ar AS
WITH invoice_agg AS (
    SELECT
        customer_id,
        SUM(net_receivable) FILTER (WHERE status = 'confirmed')                                    AS total_invoiced,
        SUM(balance_due) FILTER (
            WHERE status = 'confirmed' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 30
        )                                                                                          AS bucket_0_30,
        SUM(balance_due) FILTER (
            WHERE status = 'confirmed' AND due_date >= CURRENT_DATE - 30 AND due_date < CURRENT_DATE
        )                                                                                          AS bucket_31_60,
        SUM(balance_due) FILTER (
            WHERE status = 'confirmed' AND due_date >= CURRENT_DATE - 60 AND due_date < CURRENT_DATE - 30
        )                                                                                          AS bucket_61_90,
        SUM(balance_due) FILTER (
            WHERE status = 'confirmed' AND due_date < CURRENT_DATE - 60
        )                                                                                          AS bucket_90_plus
    FROM sale_invoices
    GROUP BY customer_id
),
payment_agg AS (
    SELECT party_id, SUM(amount) AS total_received
    FROM payments
    WHERE direction = 'received'
    GROUP BY party_id
)
SELECT
    c.customer_id,
    c.name                                          AS customer_name,
    c.credit_limit,
    c.territory,
    c.customer_type,
    c.opening_balance + COALESCE(ia.total_invoiced, 0) - COALESCE(pa.total_received, 0)
                                                     AS outstanding_balance,
    COALESCE(ia.bucket_0_30, 0)                     AS bucket_0_30,
    COALESCE(ia.bucket_31_60, 0)                    AS bucket_31_60,
    COALESCE(ia.bucket_61_90, 0)                    AS bucket_61_90,
    COALESCE(ia.bucket_90_plus, 0)                  AS bucket_90_plus
FROM customers c
LEFT JOIN invoice_agg ia ON ia.customer_id = c.customer_id
LEFT JOIN payment_agg pa ON pa.party_id = c.customer_id
WHERE c.is_active = TRUE;

COMMENT ON VIEW v_customer_ar IS 'Customer AR ageing. Invoices and payments are pre-aggregated in separate CTEs before joining to avoid fan-out row-multiplication (C4/H7 fix, 2026-07-05). Buckets age each invoice individually by due_date (M18).';

CREATE OR REPLACE VIEW v_supplier_ap AS
WITH invoice_agg AS (
    SELECT supplier_id, SUM(net_payable) FILTER (WHERE status = 'confirmed') AS total_invoiced
    FROM purchase_invoices
    GROUP BY supplier_id
),
payment_agg AS (
    SELECT party_id, SUM(amount) AS total_paid
    FROM payments
    WHERE direction = 'paid'
    GROUP BY party_id
)
SELECT
    s.supplier_id,
    s.name                                          AS supplier_name,
    s.credit_period_days,
    s.opening_balance + COALESCE(ia.total_invoiced, 0) - COALESCE(pa.total_paid, 0)
                                                     AS outstanding_payable
FROM suppliers s
LEFT JOIN invoice_agg ia ON ia.supplier_id = s.supplier_id
LEFT JOIN payment_agg pa ON pa.party_id = s.supplier_id
WHERE s.is_active = TRUE;

COMMENT ON VIEW v_supplier_ap IS 'Supplier AP. Invoices and payments are pre-aggregated in separate CTEs before joining to avoid fan-out row-multiplication (C4/H7 fix, 2026-07-05).';

COMMIT;
-- ============================================================
