import { describe, expect, it } from 'vitest';
import { computePortfolio } from '../src/compute';
import { distribution, monthsToGoal, whatIf } from '../src/analysis';
import type { CoreHolding, CoreTx, PricePoint } from '../src/types';

const H = (id: string, extra: Partial<CoreHolding> = {}): CoreHolding => ({
  id, assetId: 'asset-' + id, portfolioId: 'P1', accountId: 'C1', nombre: 'Fondo ' + id,
  tipo: 'fondo', moneda: 'EUR', ter: 0.002, ...extra,
});

let n = 0;
const T = (p: Partial<CoreTx> & Pick<CoreTx, 'tipo' | 'fecha' | 'holdingId'>): CoreTx => ({
  id: `t${++n}`, cantidad: 0, importe: 0, ...p,
});

describe('computePortfolio', () => {
  it('valor, aportado y ganancia con precios de mercado', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-01-05', cantidad: 10, importe: 100 }),
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-02-05', cantidad: 10, importe: 110 }),
      ],
      prices: { 'asset-A': [{ fecha: '2026-01-05', precio: 10 }, { fecha: '2026-03-01', precio: 12 }] },
      today: '2026-03-10',
    });
    expect(r.metrics.valor).toBe(240);
    expect(r.metrics.aportado).toBe(210);
    expect(r.metrics.ganancia).toBe(30);
    expect(r.metrics.gananciaPct!).toBeCloseTo(30 / 210, 10);
    expect(r.positions[0]!.coste).toBe(210);
    expect(r.series[0]!.fecha).toBe('2026-01-05');
    expect(r.series.at(-1)!.fecha).toBe('2026-03-10');
  });

  it('las aportaciones no cuentan como rentabilidad (TWR) ni como caída', () => {
    // Precio plano a 10: aportar mucho dinero no debe cambiar la rentabilidad ni crear drawdown.
    const prices: PricePoint[] = [{ fecha: '2025-01-01', precio: 10 }];
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-01', cantidad: 10, importe: 100 }),
        T({ holdingId: 'A', tipo: 'compra', fecha: '2025-06-01', cantidad: 1000, importe: 10000 }),
        T({ holdingId: 'A', tipo: 'venta', fecha: '2025-09-01', cantidad: 500, importe: 5000 }),
      ],
      prices: { 'asset-A': prices },
      today: '2025-12-31',
    });
    expect(r.metrics.rentabilidadAnual).toEqual([{ anio: 2025, rentabilidad: 0, parcial: false }]);
    expect(r.metrics.maxDrawdown).toBe(0);
    expect(r.metrics.ganancia).toBe(0);
  });

  it('drawdown máximo sobre la rentabilidad', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-01', cantidad: 10, importe: 100 })],
      prices: { 'asset-A': [
        { fecha: '2025-01-01', precio: 10 },
        { fecha: '2025-02-01', precio: 12 },
        { fecha: '2025-03-01', precio: 9 },   // −25 % desde el máximo de 12
        { fecha: '2025-04-01', precio: 13 },
      ] },
      today: '2025-05-01',
    });
    expect(r.metrics.maxDrawdown).toBeCloseTo(-0.25, 10);
  });

  it('rentabilidad por año natural encadenada', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [T({ holdingId: 'A', tipo: 'compra', fecha: '2024-01-01', cantidad: 1, importe: 100 })],
      prices: { 'asset-A': [
        { fecha: '2024-01-01', precio: 100 },
        { fecha: '2024-12-31', precio: 110 },
        { fecha: '2025-12-31', precio: 99 },
      ] },
      today: '2026-02-01',
    });
    const y = Object.fromEntries(r.metrics.rentabilidadAnual.map((x) => [x.anio, x]));
    expect(y[2024]!.rentabilidad).toBeCloseTo(0.10, 10);
    expect(y[2024]!.parcial).toBe(false);
    expect(y[2025]!.rentabilidad).toBeCloseTo(-0.10, 10);
    expect(y[2026]!.parcial).toBe(true);
  });

  it('TIR coherente: +10 % en un año con una sola aportación', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-01', cantidad: 10, importe: 1000 })],
      prices: { 'asset-A': [{ fecha: '2025-01-01', precio: 100 }, { fecha: '2026-01-01', precio: 110 }] },
      today: '2026-01-01',
    });
    expect(r.metrics.tir!).toBeCloseTo(0.10, 4);
  });

  it('un rebalanceo por traspaso no altera el capital aportado', () => {
    const r = computePortfolio({
      holdings: [H('A'), H('B')],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-01', cantidad: 100, importe: 1000 }),
        T({ holdingId: 'A', tipo: 'traspaso_salida', fecha: '2025-06-01', cantidad: 50, importe: 500, grupoId: 'g' }),
        T({ holdingId: 'B', tipo: 'traspaso_entrada', fecha: '2025-06-01', cantidad: 25, importe: 500, grupoId: 'g' }),
      ],
      prices: {
        'asset-A': [{ fecha: '2025-01-01', precio: 10 }],
        'asset-B': [{ fecha: '2025-01-01', precio: 20 }],
      },
      today: '2025-07-01',
    });
    expect(r.metrics.aportado).toBe(1000);
    expect(r.metrics.valor).toBe(1000);
    expect(r.flows).toHaveLength(1);
  });

  it('filtrar por cartera: el traspaso entre carteras sí es flujo para cada una', () => {
    const input = {
      holdings: [H('A'), H('B', { portfolioId: 'P2' })],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-01', cantidad: 100, importe: 1000 }),
        T({ holdingId: 'A', tipo: 'traspaso_salida', fecha: '2025-06-01', cantidad: 50, importe: 500, grupoId: 'g2' }),
        T({ holdingId: 'B', tipo: 'traspaso_entrada', fecha: '2025-06-01', cantidad: 25, importe: 500, grupoId: 'g2' }),
      ],
      prices: { 'asset-A': [{ fecha: '2025-01-01', precio: 10 }], 'asset-B': [{ fecha: '2025-01-01', precio: 20 }] },
      today: '2025-07-01',
    };
    expect(computePortfolio({ ...input, scope: ['A'] }).metrics.aportado).toBe(500);
    expect(computePortfolio({ ...input, scope: ['B'] }).metrics.aportado).toBe(500);
  });

  it('activo en USD se valora en EUR con el tipo de cambio', () => {
    const r = computePortfolio({
      holdings: [H('A', { moneda: 'USD' })],
      txs: [T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-02', cantidad: 10, importe: 1000, fxEur: 1.25 })],
      prices: { 'asset-A': [{ fecha: '2025-01-02', precio: 100 }, { fecha: '2025-03-03', precio: 120 }] },
      fx: { USD: [{ fecha: '2025-01-02', precio: 1.25 }, { fecha: '2025-03-03', precio: 1.2 }] },
      today: '2025-03-05',
    });
    expect(r.metrics.aportado).toBe(800);       // 1000 USD / 1,25
    expect(r.metrics.valor).toBe(1000);         // 10 × 120 USD / 1,2
  });

  it('sin precio de mercado usa el precio de la última operación', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [T({ holdingId: 'A', tipo: 'compra', fecha: '2025-01-02', cantidad: 4, importe: 50 })],
      prices: {},
      today: '2025-02-01',
    });
    expect(r.metrics.valor).toBe(50);
  });

  it('efectivo vale su importe aunque no haya precios', () => {
    const r = computePortfolio({
      holdings: [H('C', { tipo: 'efectivo', ter: null })],
      txs: [T({ holdingId: 'C', tipo: 'compra', fecha: '2025-01-02', cantidad: 2500, importe: 2500 })],
      prices: {},
      today: '2025-02-01',
    });
    expect(r.metrics.valor).toBe(2500);
  });

  it('aportación media, racha y comisiones', () => {
    const txs: CoreTx[] = [];
    for (const m of ['07', '08', '09', '10']) {
      txs.push(T({ holdingId: 'A', tipo: 'compra', fecha: `2026-${m}-03`, cantidad: 30, importe: 300 }));
    }
    const r = computePortfolio({
      holdings: [H('A', { ter: 0.0012 })],
      txs,
      prices: { 'asset-A': [{ fecha: '2026-07-01', precio: 10 }] },
      today: '2026-10-17',
    });
    expect(r.metrics.aportacionMediaMensual).toBe(300);
    expect(r.metrics.racha).toBe(4);
    expect(r.metrics.terMedio!).toBeCloseTo(0.0012, 10);
    expect(r.metrics.costeAnual).toBeCloseTo(1200 * 0.0012, 2);
    expect(r.metrics.mesActual.aportado).toBe(300);
  });

  it('resumen mensual separa aportación de ganancia de mercado', () => {
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-01-10', cantidad: 10, importe: 100 }),
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-02-10', cantidad: 10, importe: 110 }),
      ],
      prices: { 'asset-A': [{ fecha: '2026-01-10', precio: 10 }, { fecha: '2026-01-31', precio: 11 }, { fecha: '2026-02-28', precio: 12 }] },
      today: '2026-02-28',
    });
    expect(r.months).toEqual([
      { mes: '2026-01', aportado: 100, ganancia: 10, comisiones: 0, valorFin: 110 },
      { mes: '2026-02', aportado: 110, ganancia: 20, comisiones: 0, valorFin: 240 },
    ]);
  });

  it('la comisión de compra cuenta como comisión, no como pérdida de mercado', () => {
    // Trade Republic: compras 100 € de fondo + 1 € de comisión; el precio no se mueve.
    const r = computePortfolio({
      holdings: [H('A')],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-01-10', cantidad: 10, importe: 100, comision: 1 }),
        T({ holdingId: 'A', tipo: 'venta', fecha: '2026-02-10', cantidad: 5, importe: 50, comision: 1 }),
        T({ holdingId: 'A', tipo: 'comision', fecha: '2026-02-20', cantidad: 0.1, importe: 1 }),
      ],
      prices: { 'asset-A': [{ fecha: '2026-01-10', precio: 10 }] },
      today: '2026-02-28',
    });
    expect(r.months).toEqual([
      { mes: '2026-01', aportado: 101, ganancia: 0, comisiones: 1, valorFin: 100 },
      { mes: '2026-02', aportado: -49, ganancia: 0, comisiones: 2, valorFin: 49 },
    ]);
    expect(r.metrics.comisionesPagadas).toBe(3);
    expect(r.metrics.comisionesPorAnio).toEqual([{ anio: 2026, importe: 3 }]);
    expect(r.metrics.mesActual).toEqual({ aportado: -49, ganancia: 0, comisiones: 2 });
    expect(r.positions[0]!.comisiones).toBe(3);
    // La ganancia total sí es neta de comisiones: 49 − (101 − 49) = −3
    expect(r.metrics.ganancia).toBe(-3);
  });
});

describe('análisis', () => {
  it('what-if replica las aportaciones en el índice', () => {
    const w = whatIf(
      [{ fecha: '2025-01-01', importe: 1000 }, { fecha: '2025-07-01', importe: 1000 }],
      [{ fecha: '2025-01-01', precio: 100 }, { fecha: '2025-07-01', precio: 125 }, { fecha: '2025-12-31', precio: 150 }],
      ['2025-01-01', '2025-07-01', '2025-12-31'],
    )!;
    // 10 + 8 participaciones × 150
    expect(w.valor).toBe(2700);
  });

  it('distribución por tipo con porcentajes', () => {
    const d = distribution(
      [
        { holdingId: 'A', cantidad: 1, precio: 1, fechaPrecio: null, valor: 750, coste: 0, ganancia: 0, gananciaPct: null, precioMedio: null, comisiones: 0 },
        { holdingId: 'B', cantidad: 1, precio: 1, fechaPrecio: null, valor: 250, coste: 0, ganancia: 0, gananciaPct: null, precioMedio: null, comisiones: 0 },
      ],
      [H('A'), H('B', { tipo: 'cripto' })],
      'tipo',
    );
    expect(d.map((x) => [x.label, x.pct])).toEqual([['Fondos', 0.75], ['Cripto directa', 0.25]]);
  });

  it('distribución por clase de activo y por vehículo', () => {
    const pos = (id: string, valor: number) => ({ holdingId: id, cantidad: 1, precio: 1, fechaPrecio: null, valor, coste: 0, ganancia: 0, gananciaPct: null, precioMedio: null, comisiones: 0 });
    const hs = [H('A', { clase: 'rv' }), H('B', { clase: 'rv', tipo: 'etf' }), H('C', { clase: 'rf' }), H('D', { tipo: 'monetario', clase: 'monetario' }), H('E', { clase: null })];
    const ps = [pos('A', 50), pos('B', 20), pos('C', 20), pos('D', 5), pos('E', 5)];
    expect(distribution(ps, hs, 'clase').map((x) => [x.label, x.pct])).toEqual([['Renta variable', 0.7], ['Renta fija', 0.2], ['Monetario', 0.05], ['Otros', 0.05]]);
    // Un fondo monetario es, como vehículo, un fondo
    expect(distribution(ps, hs, 'tipo').map((x) => [x.label, x.pct])).toEqual([['Fondos', 0.8], ['ETF / ETC', 0.2]]);
  });

  it('meses hasta objetivo', () => {
    expect(monthsToGoal(0, 1200, 100, 0)).toBe(12);
    expect(monthsToGoal(5000, 1000, 0)).toBe(0);
  });
});
