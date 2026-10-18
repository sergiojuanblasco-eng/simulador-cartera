import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('fetchAll', () => {
  const rows = Array.from({ length: 2345 }, (_, i) => i);
  const fake = (withCount: boolean) => vi.fn(async (from: number, to: number, count: boolean) => ({
    data: rows.slice(from, to + 1), error: null, count: withCount && count ? rows.length : null,
  }));

  it('con total: pide el resto de páginas a la vez y no pierde filas', async () => {
    const { fetchAll } = await import('@/lib/data');
    const q = fake(true);
    const out = await fetchAll<number>(q);
    expect(out).toEqual(rows);
    expect(q).toHaveBeenCalledTimes(3);
  });

  it('sin total: sigue página a página', async () => {
    const { fetchAll } = await import('@/lib/data');
    const out = await fetchAll<number>(fake(false));
    expect(out).toEqual(rows);
  });
});
