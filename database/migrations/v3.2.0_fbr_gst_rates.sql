-- v3.2.0 — Align live products.gst_rate constraint with FBR (Pakistan) slabs.
--
-- The original constraint allowed Indian GST slabs (0/5/12/18/28). The app UI
-- now offers FBR slabs 0 (exempt) / 1 (pharma reduced rate, Finance Act 2022)
-- / 18 (standard). NOTE: rate VALUES still need owner confirmation against
-- current FBR SROs — see ROADMAP.md (H13).
--
-- Historical rates copied onto sale_invoice_items / purchase_invoice_items are
-- intentionally untouched (they are point-in-time facts, no value CHECK there).
--
-- Idempotent: safe to re-run.

BEGIN;

-- Drop the old constraint FIRST — the remap below writes values (1) that the
-- old Indian-slab constraint would reject.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_gst_rate_check;

-- Remap existing product rows still on Indian slabs to the nearest FBR slab:
-- 5 (Indian pharma) -> 1 (FBR pharma reduced); 12/28 -> 18 (standard).
UPDATE products SET gst_rate = 1  WHERE gst_rate = 5;
UPDATE products SET gst_rate = 18 WHERE gst_rate IN (12, 28);

ALTER TABLE products ADD CONSTRAINT products_gst_rate_check
  CHECK (gst_rate IN (0, 1, 18));

COMMIT;
