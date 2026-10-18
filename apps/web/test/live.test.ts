/**
 * Integración de precios en vivo contra una base de datos local (solo si LIVE_DB=1).
 * Las respuestas de EODHD y CoinGecko se simulan; Supabase es real.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const run = process.env.LIVE_DB === '1';

describe.skipIf(!run)('precios en vivo', () => {
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  let ids: { etf: string; fund: string; btc: string };

  beforeAll(async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('eodhd.com') || url.includes('coingecko.com')) {
        calls.push(url.replace(/api_token=[^&]+/, 'api_token=***'));
        let body: unknown = [];
        if (url.includes('/real-time/')) body = [{ code: 'EUNL.XETRA', timestamp: 1_792_000_000, close: 112.34 }];
        else if (url.includes('/search/IE00B42W4L06')) {
          body = [
            { Code: 'VSCU', Exchange: 'LSE', Name: 'Vanguard Global Small-Cap (USD)', Type: 'FUND', Country: 'UK', Currency: 'USD', ISIN: 'IE00B42W4L06' },
            { Code: 'IE00B42W4L06', Exchange: 'EUFUND', Name: 'Vanguard Global Small-Cap Index Fund EUR Acc', Type: 'FUND', Country: 'Unknown', Currency: 'EUR', ISIN: 'IE00B42W4L06' },
          ];
        }
        else if (url.includes('/eod/')) body = [{ date: '2026-10-15', close: 14.6399 }, { date: '2026-10-16', close: 14.7 }];
        else if (url.includes('/simple/price')) body = { bitcoin: { eur: 98765.4 } };
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return realFetch(input, init);
    }) as typeof fetch;

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const up = async (row: Record<string, unknown>) => {
      const { data: found } = await admin.from('assets').select('id').eq('proveedor', row.proveedor).eq('proveedor_id', row.proveedor_id).maybeSingle();
      if (found) { await admin.from('assets').update({ metadata: {} }).eq('id', found.id); return found.id as string; }
      const { data, error } = await admin.from('assets').insert(row).select('id').single();
      if (error) throw error;
      return data.id as string;
    };
    ids = {
      etf: await up({ nombre: 'iShares Core MSCI World', tipo: 'etf', moneda: 'EUR', proveedor: 'eodhd', proveedor_id: 'EUNL.XETRA', isin: 'IE00B4L5Y983' }),
      fund: await up({ nombre: 'Fidelity MSCI World', tipo: 'fondo', moneda: 'EUR', proveedor: 'eodhd', proveedor_id: 'IE00BYX5NX33.EUFUND', isin: 'IE00BYX5NX33' }),
      btc: await up({ nombre: 'Bitcoin', tipo: 'cripto', moneda: 'EUR', proveedor: 'coingecko', proveedor_id: 'bitcoin' }),
    };
  });
  afterAll(() => { globalThis.fetch = realFetch; });

  it('actualiza cripto, ETF (en vivo) y fondo (valor liquidativo) y respeta el límite de frecuencia', async () => {
    const { refreshPrices } = await import('@/lib/market/live');
    const { hoyMadrid } = await import('@/lib/format');
    const r = await refreshPrices([ids.etf, ids.fund, ids.btc]);
    expect(r.errores).toEqual([]);
    expect(r.actualizados).toBeGreaterThanOrEqual(3);

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data } = await admin.from('asset_prices').select('asset_id, fecha, precio, fuente').in('asset_id', [ids.etf, ids.fund, ids.btc]).eq('fecha', hoyMadrid());
    const byId = new Map((data ?? []).map((d) => [d.asset_id, d]));
    expect(Number(byId.get(ids.btc)?.precio)).toBeCloseTo(98765.4, 2);
    expect(Number(byId.get(ids.etf)?.precio)).toBeCloseTo(112.34, 2);
    expect(byId.get(ids.etf)?.fuente).toBe('live');
    // El fondo no tiene precio en vivo: su último valor liquidativo viene de /eod/
    const { data: nav } = await admin.from('asset_prices').select('fecha, precio').eq('asset_id', ids.fund).eq('fecha', '2026-10-16').maybeSingle();
    expect(Number(nav?.precio)).toBeCloseTo(14.7, 4);
    expect(calls.some((c) => c.includes('/real-time/') && c.includes('EUFUND'))).toBe(false);

    // Segunda llamada inmediata: no se vuelve a pedir nada al proveedor
    const before = calls.length;
    await refreshPrices([ids.etf, ids.fund, ids.btc]);
    expect(calls.length).toBe(before);
  });

  it('al conectar EODHD, los productos propios con ISIN se enlazan (cotización en euros y TER del catálogo)', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data: pf } = await admin.from('portfolios').select('id, user_id').limit(1).single();
    const { data: acc } = await admin.from('accounts').select('id').eq('user_id', pf!.user_id).limit(1).single();
    const { data: own } = await admin.from('assets').insert({ owner_id: pf!.user_id, nombre: 'Vanguard Global Small-Cap Index EUR Acc', tipo: 'fondo', moneda: 'EUR', isin: 'IE00B42W4L06', proveedor: 'manual', metadata: { enlace_intentado: '2026-10-18' } }).select('id').single();
    const { data: h } = await admin.from('holdings').insert({ user_id: pf!.user_id, portfolio_id: pf!.id, account_id: acc!.id, asset_id: own!.id }).select('id').single();
    const { fixOwnAssets } = await import('@/lib/market/ingest');
    // Sin forzar: ya se intentó hoy (antes de tener clave) → no se toca
    // Forzado (botón «Actualizar precios ahora»): se enlaza
    const r = await fixOwnAssets(200, true);
    expect(r.errores).toEqual([]);
    const { data: after } = await admin.from('holdings').select('asset:assets (proveedor, proveedor_id, owner_id, ter)').eq('id', h!.id).single();
    const a = after!.asset as unknown as { proveedor: string; proveedor_id: string; owner_id: string | null; ter: string | null };
    expect(a.proveedor).toBe('eodhd');
    expect(a.proveedor_id).toBe('IE00B42W4L06.EUFUND');
    expect(a.owner_id).toBeNull();
    expect(Number(a.ter)).toBeCloseTo(0.003, 6);
  });
});
