import { describe, expect, it, vi } from 'vitest';

import { ShadowFacade } from './ShadowFacade';

describe('ShadowFacade', () => {
  it('runs mutations exactly once (new only when available)', async () => {
    const oldApi = { addSale: vi.fn(async () => ({ success: true, src: 'old' })) };
    const newApi = { addSale: vi.fn(async () => ({ success: true, src: 'new' })) };

    const facade = new ShadowFacade({ oldApi, newApi, onMismatch: vi.fn() });
    const res = await facade.route('addSale', { any: 'payload' });

    expect(res).toEqual({ success: true, src: 'new' });
    expect(newApi.addSale).toHaveBeenCalledTimes(1);
    expect(oldApi.addSale).toHaveBeenCalledTimes(0);
  });

  it('falls back to legacy for mutations when new is missing', async () => {
    const oldApi = { addSale: vi.fn(async () => ({ success: true, src: 'old' })) };
    const newApi = {};

    const facade = new ShadowFacade({ oldApi, newApi, onMismatch: vi.fn() });
    const res = await facade.route('addSale', { any: 'payload' });

    expect(res).toEqual({ success: true, src: 'old' });
    expect(oldApi.addSale).toHaveBeenCalledTimes(1);
  });

  it('shadows reads (runs both) but returns new result when both succeed', async () => {
    const oldApi = { getProducts: vi.fn(async () => [{ id: 1 }]) };
    const newApi = { getProducts: vi.fn(async () => [{ id: 1 }]) };

    const facade = new ShadowFacade({ oldApi, newApi, onMismatch: vi.fn() });
    const res = await facade.route('getProducts');

    expect(res).toEqual([{ id: 1 }]);
    expect(newApi.getProducts).toHaveBeenCalledTimes(1);
    expect(oldApi.getProducts).toHaveBeenCalledTimes(1);
  });
});
