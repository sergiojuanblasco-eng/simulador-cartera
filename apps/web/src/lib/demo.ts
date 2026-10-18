import { addDays, computePortfolio, type CoreHolding, type CoreTx, type PricePoint } from '@kartera/core';

/** Datos de ejemplo deterministas para la vista previa de desarrollo (/dev/preview). */
export function demoData(today: string) {
  const start = addDays(today, -730);
  const holdings: CoreHolding[] = [
    { id: 'h1', assetId: 'a1', portfolioId: 'p1', accountId: 'c1', nombre: 'Fidelity MSCI World Index Fund', tipo: 'fondo', moneda: 'EUR', ter: 0.0012 },
    { id: 'h2', assetId: 'a2', portfolioId: 'p1', accountId: 'c2', nombre: 'iShares Core S&P 500 ETF', tipo: 'etf', moneda: 'EUR', ter: 0.0007 },
    { id: 'h3', assetId: 'a3', portfolioId: 'p1', accountId: 'c1', nombre: 'Vanguard Emerging Markets', tipo: 'fondo', moneda: 'EUR', ter: 0.0023 },
    { id: 'h4', assetId: 'a4', portfolioId: 'p2', accountId: 'c1', nombre: 'Fondo monetario', tipo: 'monetario', moneda: 'EUR', ter: 0.001 },
    { id: 'h5', assetId: 'a5', portfolioId: 'p3', accountId: 'c3', nombre: 'Bitcoin', tipo: 'cripto', moneda: 'EUR', ter: null },
  ];
  // Precios sintéticos con tendencia, ciclo y una caída a mitad de periodo
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const params: Record<string, [number, number, number]> = { a1: [10, 0.0004, 0.006], a2: [80, 0.0005, 0.008], a3: [20, 0.0002, 0.009], a4: [100, 0.00009, 0.0003], a5: [30000, 0.0009, 0.03] };
  const prices: Record<string, PricePoint[]> = {};
  for (const [a, [p0, drift, vol]] of Object.entries(params)) {
    let p = p0;
    const pts: PricePoint[] = [];
    for (let i = 0, d = start; d <= today; i++, d = addDays(d, 1)) {
      const crash = i > 250 && i < 300 ? -0.004 * (a === 'a4' ? 0 : 1) : 0;
      p = p * (1 + drift + crash + vol * rnd());
      pts.push({ fecha: d, precio: Math.round(p * 10000) / 10000 });
    }
    prices[a] = pts;
  }
  const priceOn = (a: string, d: string) => Number(prices[a]!.find((x) => x.fecha >= d)?.precio ?? 1);
  const txs: CoreTx[] = [];
  let n = 0;
  const buy = (h: string, a: string, d: string, imp: number) => txs.push({ id: `t${++n}`, holdingId: h, tipo: 'compra', fecha: d, importe: imp, cantidad: imp / priceOn(a, d) });
  buy('h4', 'a4', start, 6000);
  for (let m = 0; m < 24; m++) {
    const d = addDays(start, m * 30 + 3);
    buy('h1', 'a1', d, 350);
    buy('h2', 'a2', addDays(d, 1), 150);
    if (m % 2 === 0) buy('h3', 'a3', addDays(d, 2), 100);
    if (m % 3 === 0) buy('h5', 'a5', addDays(d, 4), 50);
  }
  const result = computePortfolio({ holdings, txs, prices, today });
  return {
    holdings,
    result,
    labels: {
      carteras: { p1: 'Largo plazo', p2: 'Colchón', p3: 'Especulativo' },
      cuentas: { c1: 'MyInvestor', c2: 'Trade Republic', c3: 'Exchange cripto' },
    },
  };
}
