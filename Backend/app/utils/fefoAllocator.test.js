const { test } = require('node:test');
const assert = require('node:assert');
const { calculateFefoPlan } = require('./fefoAllocator');

test('FEFO Allocator Specifications', async (t) => {

  await t.test('Should allocate from a single batch when sufficient stock exists', () => {
    const requestedItems = [
      { productId: 'p1', quantity: 50, discountPct: 0 }
    ];
    const lockedBatches = [
      { batch_id: 'b1', product_id: 'p1', quantity_available: 100, sale_rate: 10, gst_rate: 0 }
    ];

    const result = calculateFefoPlan(requestedItems, lockedBatches);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].batch_id, 'b1');
    assert.strictEqual(result[0].quantity, 50);
  });

  await t.test('Should split allocation across multiple batches based on FEFO order', () => {
    const requestedItems = [
      { productId: 'p1', quantity: 150, discountPct: 5 }
    ];
    // Batches are pre-sorted by expiry_date ASC from the DB query
    const lockedBatches = [
      { batch_id: 'b1', product_id: 'p1', quantity_available: 100, sale_rate: 10, gst_rate: 0 },
      { batch_id: 'b2', product_id: 'p1', quantity_available: 200, sale_rate: 12, gst_rate: 0 }
    ];

    const result = calculateFefoPlan(requestedItems, lockedBatches);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].batch_id, 'b1');
    assert.strictEqual(result[0].quantity, 100);
    assert.strictEqual(result[0].discountPct, 5);

    assert.strictEqual(result[1].batch_id, 'b2');
    assert.strictEqual(result[1].quantity, 50);
    assert.strictEqual(result[1].discountPct, 5);
  });

  await t.test('Should handle multiple products concurrently', () => {
    const requestedItems = [
      { productId: 'p1', quantity: 20, discountPct: 0 },
      { productId: 'p2', quantity: 30, discountPct: 0 }
    ];
    const lockedBatches = [
      { batch_id: 'b1', product_id: 'p1', quantity_available: 50, sale_rate: 10, gst_rate: 0 },
      { batch_id: 'b2', product_id: 'p2', quantity_available: 10, sale_rate: 20, gst_rate: 0 },
      { batch_id: 'b3', product_id: 'p2', quantity_available: 100, sale_rate: 20, gst_rate: 0 }
    ];

    const result = calculateFefoPlan(requestedItems, lockedBatches);

    assert.strictEqual(result.length, 3);
    // Product 1
    const p1Result = result.find(r => r.batch_id === 'b1');
    assert.strictEqual(p1Result.quantity, 20);

    // Product 2 splits
    const p2Result1 = result.find(r => r.batch_id === 'b2');
    assert.strictEqual(p2Result1.quantity, 10);

    const p2Result2 = result.find(r => r.batch_id === 'b3');
    assert.strictEqual(p2Result2.quantity, 20);
  });

  await t.test('Should throw an error (Fail Loud) if total stock is insufficient for a product', () => {
    const requestedItems = [
      { productId: 'p1', quantity: 150, discountPct: 0 }
    ];
    const lockedBatches = [
      { batch_id: 'b1', product_id: 'p1', quantity_available: 100, sale_rate: 10, gst_rate: 0 }
    ];

    assert.throws(() => {
      calculateFefoPlan(requestedItems, lockedBatches);
    }, /Insufficient stock for product: p1/);
  });

  await t.test('Should throw an error if no batches exist for a requested product', () => {
    const requestedItems = [
      { productId: 'p1', quantity: 10, discountPct: 0 }
    ];
    const lockedBatches = [];

    assert.throws(() => {
      calculateFefoPlan(requestedItems, lockedBatches);
    }, /Insufficient stock for product: p1/);
  });

});
