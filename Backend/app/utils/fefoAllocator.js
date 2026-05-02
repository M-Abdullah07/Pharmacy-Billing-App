/**
 * Pure FEFO (First-Expire-First-Out) batch allocation.
 *
 * @param {Array<{productId: string, productName: string, quantity: number, saleRate: number|null, discountPct: number}>} requestedItems
 * @param {Array<{batch_id: string, product_id: string, quantity_available: number, sale_rate: number, gst_rate: number}>} lockedBatches
 *   lockedBatches MUST arrive pre-sorted by (product_id, expiry_date ASC) — guaranteed by the
 *   calling SQL: ORDER BY b.product_id, b.expiry_date ASC.
 * @returns {Array<{batch_id: string, product_id: string, quantity: number, sale_rate: number, gst_rate: number, discountPct: number}>}
 * @throws {Error} When insufficient stock exists for any requested product.
 */
function calculateFefoPlan(requestedItems, lockedBatches) {
  // Mutable local copy so we can decrement availability without touching DB rows.
  const mutableBatches = lockedBatches.map(b => ({
    ...b,
    quantity_available: Number(b.quantity_available),
  }));

  const allocationPlan = [];

  for (const item of requestedItems) {
    let remaining = item.quantity;

    // lockedBatches are already ordered by expiry_date ASC per product — FEFO is implicit.
    const productBatches = mutableBatches.filter(b => b.product_id === item.productId);

    for (const batch of productBatches) {
      if (remaining <= 0) break;
      if (batch.quantity_available <= 0) continue;

      const take = Math.min(remaining, batch.quantity_available);

      // Honour the per-item sale rate override; fall back to the batch MRP.
      const effectiveSaleRate =
        item.saleRate != null && item.saleRate > 0
          ? item.saleRate
          : batch.sale_rate;

      allocationPlan.push({
        batch_id:    batch.batch_id,
        product_id:  batch.product_id,
        quantity:    take,
        sale_rate:   effectiveSaleRate,
        gst_rate:    batch.gst_rate,
        discountPct: item.discountPct ?? 0,
      });

      remaining                  -= take;
      batch.quantity_available   -= take;
    }

    if (remaining > 0) {
      // Use the human-readable product name (preferred) or fall back to the ID for debugging.
      const label = item.productName || item.productId;
      throw new Error(
        `Insufficient stock for "${label}". Short by ${remaining} unit(s).`
      );
    }
  }

  return allocationPlan;
}

module.exports = { calculateFefoPlan };
