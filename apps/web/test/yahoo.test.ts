import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function chart(symbol: string, currency: string, closes: [string, number | null][], last?: number) {
  return {
    chart: {
      result: [{
        meta: { symbol, currency, gmtoffset: 7200, regularMarketPrice: last, regularMarketTime: 1_792_300_000 },
        timestamp: closes.map(([d]) => Date.parse(d + 'T07:00:00Z') / 1000 - 7200),
        indicators: { quote: [{ close: closes.map(([, c]) => c) }] },
      }],
      error: null,
    },
  };
}

describe('Yahoo Finance (fuente gratis)', () => {
  it('lee cierres diarios, ignora huecos y pasa peniques a libras', async () => {
    globalThis.fetch = (async () => json(chart('IGLN.L', 'GBp', [['2026-10-14', 6100], ['2026-10-15', null], ['2026-10-16', 6150]], 6160))) as typeof fetch;
    const { yahooChart } = await import('@/lib/market/providers');
    const c = await yahooChart('IGLN.L', '2026-10-01');
    expect(c.currency).toBe('GBP');
    expect(c.points).toEqual([{ fecha: '2026-10-14', precio: 61 }, { fecha: '2026-10-16', precio: 61.5 }]);
    expect(c.last?.precio).toBeCloseTo(61.6, 6);
  });

  it('elige el fondo (valor liquidativo en euros) y descarta símbolos sin historia', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/finance/search')) {
        return json({ quotes: [
          { symbol: 'IE00BK5BQT80.SG', quoteType: 'ETF', longname: 'Vanguard FTSE All-World (SG)', exchDisp: 'Stuttgart' },
          { symbol: 'VWRA.L', quoteType: 'ETF', longname: 'Vanguard FTSE All-World USD Acc', exchDisp: 'London' },
          { symbol: 'VWCE.DE', quoteType: 'ETF', longname: 'Vanguard FTSE All-World UCITS ETF', exchDisp: 'XETRA' },
        ] });
      }
      if (url.includes('IE00BK5BQT80.SG')) return json(chart('IE00BK5BQT80.SG', 'EUR', [], 169.16));
      if (url.includes('VWCE.DE')) return json(chart('VWCE.DE', 'EUR', [['2026-10-14', 168.2], ['2026-10-15', 168.9], ['2026-10-16', 169.1]], 169.2));
      return json(chart('VWRA.L', 'USD', [['2026-10-16', 190]], 190));
    }) as typeof fetch;
    const { yahooTarget } = await import('@/lib/market/asset-fix');
    const t = await yahooTarget('IE00BK5BQT80');
    // .DE (euros, con historia) gana a Stuttgart sin historia y a Londres en dólares
    expect(t?.proveedorId).toBe('VWCE.DE');
    expect(t?.moneda).toBe('EUR');
    expect(t?.isin).toBe('IE00BK5BQT80');
  });

  it('para un fondo prefiere su ticker de fondo «0P…»', async () => {
    const { pickYahoo } = await import('@/lib/market/providers');
    const base = { proveedor: 'yahoo' as const, nombre: 'x', isin: 'IE00BYX5NX33', ticker: null, moneda: 'EUR', detalle: '' };
    const best = pickYahoo([
      { ...base, proveedorId: 'FEPD.SG', tipo: 'etf' },
      { ...base, proveedorId: '0P0001CLDK.F', tipo: 'fondo' },
    ]);
    expect(best?.proveedorId).toBe('0P0001CLDK.F');
  });
});
