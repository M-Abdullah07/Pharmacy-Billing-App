/**
 * Pure function to calculate the FEFO (First-Expire-First-Out) batch allocation split.
 * @param {Array<{productId: string, quantity: number, discountPct: number}>} requestedItems
 * @param {Array<{batch_id: string, product_id: string, quantity_available: number, sale_rate: number, gst_rate: number}>} lockedBatches
 * @returns {Array<{batch_id: string, product_id: string, quantity: number, sale_rate: number, gst_rate: number, discountPct: number}>}
 */
function calculateFefoPlan(requestedItems, lockedBatches) {
  const allocationPlan = [];

  for (const item of requestedItems) {
    let remainingQuantity = item.quantity;

    // Filter batches for this specific product
    // Note: We assume lockedBatches are ALREADY ordered by expiry_date ASC from the database query.
    const productBatches = lockedBatches.filter(b => b.product_id === item.productId);

    for (const batch of productBatches) {
      if (remainingQuantity <= 0) break;
      if (batch.quantity_available <= 0) continue;

      const takeQty = Math.min(remainingQuantity, batch.quantity_available);

      allocationPlan.push({
        batch_id: batch.batch_id,
        product_id: batch.product_id,
        quantity: takeQty,
        sale_rate: batch.sale_rate,
        gst_rate: batch.gst_rate,
        discountPct: item.discountPct || 0
      });

      remainingQuantity -= takeQty;
      // Mutate local copy of available quantity to allow multiple items requesting same product (though UI should aggregate)
      batch.quantity_available -= takeQty;
    }

    if (remainingQuantity > 0) {
      throw new Error(`Insufficient stock for product: ${item.productId}. Short by: ${remainingQuantity}`);
    }
  }

  return allocationPlan;
}

module.exports = { calculateFefoPlan };
