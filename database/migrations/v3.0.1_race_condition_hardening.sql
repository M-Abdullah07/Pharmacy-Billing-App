-- ============================================================
-- PHARMAX MIGRATION: V3.0.0 -> V3.0.1 (Race Condition Hardening)
-- ============================================================
-- Purpose: Hardens the schema against race conditions and status reversal.
--          Transitions from manual logic to database-level invariants.
--
-- TARGET : production
-- DATE   : 2026-03-24
-- ============================================================

BEGIN;

-- 1. PRE-MIGRATION SAFETY CHECK
-- Ensure no invalid negative stock exists before applying the hard constraint.
-- If this query returns rows, FIX THEM manually before proceeding.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM batches WHERE quantity_available < 0) THEN
        RAISE EXCEPTION 'MIGRATION BLOCKED: Negative stock detected in % batches. Fix inventory before applying safety constraints.', 
            (SELECT count(*) FROM batches WHERE quantity_available < 0);
    END IF;
END $$;


-- 2. HARDEN BATCH CONSTRAINTS
-- We move from implicit column-based checks to explicit, named table constraints.
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_quantity_available_check;
ALTER TABLE batches ADD CONSTRAINT chk_batches_not_negative CHECK (quantity_available >= 0);
ALTER TABLE batches ADD CONSTRAINT chk_batches_qty_limit   CHECK (quantity_available <= quantity_received);


-- 3. INITIALIZE INVOICE SEQUENCING
-- Create the sequence if it doesn't exist.
CREATE SEQUENCE IF NOT EXISTS sale_invoice_num_seq;

-- "Backfill" the sequence so it starts ABOVE your highest existing invoice number.
-- This prevents "duplicate key" errors on your next sale.
--
-- BUG FIX (H1/M15/M16, 2026-07-05): the original expression used
-- `regexp_replace(invoice_number, '\D', '', 'g')`, which strips ALL non-digit
-- characters from the ENTIRE string — including the year segment. For
-- 'INV-2026-000012' that concatenates to '2026000012' instead of the intended
-- running sequence '000012', inflating the backfilled sequence value by ~6
-- orders of magnitude and corrupting the zero-padding assumption baked into
-- the DEFAULT expression below (lpad(..., 6, '0')). Fixed to extract only the
-- numeric segment AFTER the last '-' (the actual running number), falling
-- back safely to 0 for any invoice_number that doesn't match the 'INV-YYYY-######'
-- shape.
SELECT setval('sale_invoice_num_seq',
    COALESCE(
        (SELECT MAX(NULLIF(regexp_replace(split_part(invoice_number, '-', 3), '\D', '', 'g'), '')::BIGINT)
         FROM sale_invoices
         WHERE invoice_number ~ '^INV-\d{4}-\d+$'),
        0
    ) + 1
);

-- Apply the new sequence-based default for all FUTURE invoices.
ALTER TABLE sale_invoices ALTER COLUMN invoice_number 
    SET DEFAULT concat('INV-', to_char(CURRENT_DATE, 'YYYY'), '-', lpad(nextval('sale_invoice_num_seq')::text, 6, '0'));


-- 4. APPLY ATOMIC TRIGGER UPDATES
-- We replace those trigger functions with the new locking-aware versions.

-- Atomic Stock Sync (removed redundant SELECT)
CREATE OR REPLACE FUNCTION fn_sync_batch_quantity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Atomic Update: The DB handles row-locking and check-constraints automatically.
    UPDATE batches
    SET quantity_available = quantity_available +
        CASE
            WHEN NEW.movement_type IN ('purchase','sale_return','adjustment_in') THEN NEW.quantity
            WHEN NEW.movement_type IN ('sale','purchase_return','adjustment_out','expiry_writeoff') THEN -NEW.quantity
            ELSE 0
        END,
        updated_at = now()
    WHERE batch_id = NEW.batch_id;
    RETURN NEW;
END;
$$;

-- Pessimistic Credit Locking & Status Guard
CREATE OR REPLACE FUNCTION fn_check_credit_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_current_balance   NUMERIC(15,2);
    v_credit_limit      NUMERIC(15,2);
BEGIN
    -- Status Reversal Guard (Crucial for inventory integrity)
    IF OLD.status = 'confirmed' AND NEW.status = 'draft' THEN
        RAISE EXCEPTION 'Safety Violation: Once confirmed, an invoice status cannot be reverted to draft.';
    END IF;

    IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN
        -- PESSIMISTIC LOCK: Serialize confirmation sessions for the SAME customer.
        PERFORM * FROM customers WHERE customer_id = NEW.customer_id FOR UPDATE;

        SELECT
            opening_balance + COALESCE((SELECT SUM(net_receivable) FROM sale_invoices WHERE customer_id = NEW.customer_id AND status = 'confirmed'), 0) 
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = NEW.customer_id AND direction = 'received'), 0),
            credit_limit
        INTO v_current_balance, v_credit_limit
        FROM customers WHERE customer_id = NEW.customer_id;

        IF v_credit_limit > 0 AND v_current_balance + NEW.net_receivable > v_credit_limit THEN
            RAISE WARNING 'Invoice % would exceed credit limit. Proceeding with override.', NEW.invoice_number;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMIT;
-- ============================================================
