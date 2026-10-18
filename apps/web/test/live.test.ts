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
      if (url.includes('finance.yahoo.com')) {
        calls.push(url);
        if (url.includes('/v1/finance/search')) {
          // Solo conoce Groupama Trésorerie (para no enlazar por error otros productos de la base de pruebas)
          const quotes = url.includes('FR0013314234') ? [{ symbol: '0P0001FG62.F', quoteType: 'MUTUALFUND', longname: 'Groupama Trésorerie NC', exchDisp: 'Frankfurt' }] : [];
          return new Response(JSON.stringify({ quotes }), { status: 200 });
        }
        const ts = (d: string) => Date.parse(d + 'T00:00:00Z') / 1000;
        return new Response(JSON.stringify({ chart: { result: [{ meta: { currency: 'EUR', gmtoffset: 0, regularMarketPrice: 111.46, regularMarketTime: ts('2026-10-15') },
          timestamp: [ts('2026-10-13'), ts('2026-10-14'), ts('2026-10-15')], indicators: { quote: [{ close: [111.4, 111.43, 111.46] }] } }], error: null } }), { status: 200 });
      }
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
    const { data: any } = await admin.from('portfolios').select('user_id').limit(1).single();
    const { data: pf } = await admin.from('portfolios').insert({ user_id: any!.user_id, nombre: `Prueba EODHD ${Date.now()}`, objetivo: 'personalizado' }).select('id, user_id').single();
    const { data: acc } = await admin.from('accounts').select('id').eq('user_id', pf!.user_id).limit(1).single();
    await admin.from('assets').delete().eq('owner_id', pf!.user_id).eq('isin', 'IE00B42W4L06');
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

  it('sin EODHD: enlaza gratis con Yahoo (fondo «0P…») y descarga su valor liquidativo', async () => {
    const key = process.env.EODHD_API_KEY;
    delete process.env.EODHD_API_KEY;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const { data: any } = await admin.from('portfolios').select('user_id').limit(1).single();
      const { data: pf } = await admin.from('portfolios').insert({ user_id: any!.user_id, nombre: `Prueba Yahoo ${Date.now()}`, objetivo: 'personalizado' }).select('id, user_id').single();
      const { data: acc } = await admin.from('accounts').select('id').eq('user_id', pf!.user_id).limit(1).single();
      await admin.from('assets').delete().is('owner_id', null).eq('isin', 'FR0013314234');
      const { data: own } = await admin.from('assets').insert({ owner_id: pf!.user_id, nombre: 'Groupama Trésorerie NC', tipo: 'monetario', moneda: 'EUR', isin: 'FR0013314234', proveedor: 'manual', metadata: { enlace_intentado: '2026-10-18' } }).select('id').single();
      const { data: h } = await admin.from('holdings').insert({ user_id: pf!.user_id, portfolio_id: pf!.id, account_id: acc!.id, asset_id: own!.id }).select('id').single();
      const { fixOwnAssets } = await import('@/lib/market/ingest');
      // La marca de intento antigua (sin fuente) no cuenta: se enlaza sin forzar
      const r = await fixOwnAssets(200, false);
      expect(r.errores).toEqual([]);
      const { data: after } = await admin.from('holdings').select('asset:assets (id, proveedor, proveedor_id, ter, moneda)').eq('id', h!.id).single();
      const a = after!.asset as unknown as { id: string; proveedor: string; proveedor_id: string; ter: string | null; moneda: string };
      expect([a.proveedor, a.proveedor_id, a.moneda]).toEqual(['yahoo', '0P0001FG62.F', 'EUR']);
      expect(Number(a.ter)).toBeCloseTo(0.0027, 6);
      const { refreshPrices } = await import('@/lib/market/live');
      await refreshPrices([a.id], { force: true });
      const { data: px } = await admin.from('asset_prices').select('fecha, precio, fuente').eq('asset_id', a.id).order('fecha');
      expect((px ?? []).map((x) => [x.fecha, Number(x.precio), x.fuente])).toEqual([['2026-10-13', 111.4, 'yahoo'], ['2026-10-14', 111.43, 'yahoo'], ['2026-10-15', 111.46, 'yahoo']]);
    } finally {
      process.env.EODHD_API_KEY = key;
    }
  });
});
