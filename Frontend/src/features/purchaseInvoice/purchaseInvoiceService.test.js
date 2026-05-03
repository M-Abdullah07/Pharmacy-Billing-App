import { describe, expect, it, vi } from 'vitest';

import { purchaseInvoiceService } from './purchaseInvoiceService';

function installElectronApi(overrides = {}) {
  globalThis.window = {
    electronAPI: {
      addPurchaseInvoice: vi.fn(async (payload) => ({ success: true, payload })),
      ...overrides,
    },
  };
}

describe('purchaseInvoiceService.addPurchaseInvoice', () => {
  it('transforms draft into legacy header payload + totals and calls electron API once', async () => {
    const addPurchaseInvoice = vi.fn(async () => ({ success: true, lastID: 123 }));
    installElectronApi({ addPurchaseInvoice });

    const raw = {
      header: {
        supplier_id: '10',
        invoice_number: 'INV-1',
        invoice_date: '2026-05-03',
        received_date: '2026-05-03',
        discount_amount: '5',
      },
      lines: [
        {
          product_id: '7',
          batch_number: 'B1',
          manufacturing_date: '2026-01-01',
          expiry_date: '2027-01-01',
          mrp: '100',
          purchase_cost_per_unit: '80',
          quantity: '2',
          discount_pct: '0',
          gst_rate: '18',
        },
      ],
    };

    const res = await purchaseInvoiceService.addPurchaseInvoice(raw);

    expect(res).toEqual({ success: true, lastID: 123 });
    expect(addPurchaseInvoice).toHaveBeenCalledTimes(1);

    const payload = addPurchaseInvoice.mock.calls[0][0];
    expect(payload).toMatchObject({
      supplier_id: '10',
      invoice_number: 'INV-1',
      status: 'draft',
      discount_amount: 5,
      subtotal: 160,
      tax_amount: 28.8,
      net_payable: 183.8,
    });
  });

  it('fails fast on invalid draft (no electron call)', async () => {
    const addPurchaseInvoice = vi.fn(async () => ({ success: true, lastID: 123 }));
    installElectronApi({ addPurchaseInvoice });

    await expect(
      purchaseInvoiceService.addPurchaseInvoice({
        header: { supplier_id: '', invoice_number: '' },
        lines: [],
      })
    ).rejects.toThrow();

    expect(addPurchaseInvoice).toHaveBeenCalledTimes(0);
  });
});
