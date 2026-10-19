import { describe, expect, it } from 'vitest';
import { computePortfolio } from '../src/compute';
import { milestones, monthDetail } from '../src/month';
import type { CoreHolding, CoreTx } from '../src/types';

const H = (id: string, extra: Partial<CoreHolding> = {}): CoreHolding => ({
  id, assetId: 'asset-' + id, portfolioId: 'P1', accountId: 'C1', nombre: 'Producto ' + id,
  tipo: 'fondo', moneda: 'EUR', ...extra,
});
let n = 0;
const T = (p: Partial<CoreTx> & Pick<CoreTx, 'tipo' | 'fecha' | 'holdingId'>): CoreTx => ({
  id: `t${++n}`, cantidad: 0, importe: 0, ...p,
});

describe('valores anotados a mano', () => {
  it('cuenta corriente: el saldo entra al panel y sus cambios son dinero tuyo, nunca mercado', () => {
    const r = computePortfolio({
      holdings: [H('CTA', { tipo: 'efectivo', manual: true })],
      txs: [],
      prices: {},
      valuations: {
        CTA: [
          { fecha: '2026-01-15', valor: 5000 },
          { fecha: '2026-02-15', valor: 5600 },
          { fecha: '2026-03-15', valor: 5300 },
        ],
      },
      today: '2026-03-20',
    });
    expect(r.metrics.valor).toBe(5300);
    expect(r.metrics.aportado).toBe(5300);
    expect(r.metrics.ganancia).toBe(0);
    expect(r.months).toEqual([
      { mes: '2026-01', aportado: 0, nuevo: 5000, ganancia: 0, comisiones: 0, valorFin: 5000 },
      { mes: '2026-02', aportado: 600, nuevo: 0, ganancia: 0, comisiones: 0, valorFin: 5600 },
      { mes: '2026-03', aportado: -300, nuevo: 0, ganancia: 0, comisiones: 0, valorFin: 5300 },
    ]);
    // Los cambios de saldo de una cuenta no son aportaciones a la inversión
    expect(r.metrics.racha).toBe(0);
    expect(r.metrics.aportacionMediaMensual).toBe(0);
    const p = r.positions[0]!;
    expect(p).toMatchObject({ manual: true, conAportado: false, valor: 5300, ganancia: 0, gananciaPct: null, fechaPrecio: '2026-03-15' });
    // El saldo se mantiene entre anotaciones
    expect(r.series.find((x) => x.fecha === '2026-02-28')!.valor).toBe(5600);
  });

  it('plan de pensiones con lo aportado: separa tu dinero de lo que hizo el mercado', () => {
    const r = computePortfolio({
      holdings: [H('PP', { tipo: 'plan_pensiones', manual: true })],
      txs: [],
      prices: {},
      valuations: {
        PP: [
          { fecha: '2026-01-31', valor: 12000, aportado: 10000 },
          { fecha: '2026-02-28', valor: 12300, aportado: 10100 },
          // Sin aportado: se entiende que no has aportado nada nuevo
          { fecha: '2026-03-31', valor: 12150 },
        ],
      },
      today: '2026-04-05',
    });
    expect(r.metrics.valor).toBe(12150);
    expect(r.metrics.aportado).toBe(10100);
    expect(r.metrics.ganancia).toBe(2050);
    expect(r.months.map((m) => [m.mes, m.aportado, m.nuevo, m.ganancia])).toEqual([
      ['2026-01', 0, 12000, 0],
      ['2026-02', 100, 0, 200],
      ['2026-03', 0, 0, -150],
      ['2026-04', 0, 0, 0],
    ]);
    expect(r.positions[0]).toMatchObject({ coste: 10100, ganancia: 2050, conAportado: true });
    expect(r.positions[0]!.gananciaPct!).toBeCloseTo(2050 / 10100, 10);
    // Aportar a un plan sí es invertir
    expect(r.metrics.aportacionMediaMensual).toBeGreaterThan(0);
    // La entrada al panel no cuenta como rentabilidad: el TWR solo ve +200 y −150
    expect(r.metrics.rentabilidadAnual[0]!.rentabilidad).toBeCloseTo((12300 - 100) / 12000 * (12150 / 12300) - 1, 6);
  });

  it('las operaciones de un producto anotado se ignoran y el «¿y si…?» solo usa compras de mercado', () => {
    const r = computePortfolio({
      holdings: [H('F'), H('CTA', { tipo: 'efectivo', manual: true })],
      txs: [
        T({ holdingId: 'F', tipo: 'compra', fecha: '2026-01-10', cantidad: 10, importe: 100 }),
        T({ holdingId: 'CTA', tipo: 'compra', fecha: '2026-01-10', cantidad: 999, importe: 999 }),
      ],
      prices: { 'asset-F': [{ fecha: '2026-01-10', precio: 10 }, { fecha: '2026-02-01', precio: 11 }] },
      valuations: { CTA: [{ fecha: '2026-01-20', valor: 2000 }] },
      today: '2026-02-10',
    });
    expect(r.metrics.valor).toBe(2110);
    expect(r.flowsMercado).toEqual([{ fecha: '2026-01-10', importe: 100 }]);
    expect(r.flows).toEqual([{ fecha: '2026-01-10', importe: 100 }, { fecha: '2026-01-20', importe: 2000 }]);
    expect(r.months.map((m) => [m.mes, m.aportado, m.nuevo, m.ganancia])).toEqual([
      ['2026-01', 100, 2000, 0],
      ['2026-02', 0, 0, 10],
    ]);
  });
});

describe('detalle del mes por producto', () => {
  it('cada producto: al empezar, lo que pusiste, lo que entró, el mercado y al cerrar', () => {
    const r = computePortfolio({
      holdings: [H('A'), H('B'), H('CTA', { tipo: 'efectivo', manual: true })],
      txs: [
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-01-10', cantidad: 10, importe: 100, comision: 1 }),
        T({ holdingId: 'A', tipo: 'compra', fecha: '2026-02-10', cantidad: 10, importe: 110, comision: 1 }),
        T({ holdingId: 'B', tipo: 'compra', fecha: '2026-02-12', cantidad: 5, importe: 50 }),
      ],
      prices: {
        'asset-A': [{ fecha: '2026-01-10', precio: 10 }, { fecha: '2026-01-31', precio: 11 }, { fecha: '2026-02-27', precio: 12 }],
        'asset-B': [{ fecha: '2026-02-12', precio: 10 }, { fecha: '2026-02-27', precio: 9 }],
      },
      valuations: { CTA: [{ fecha: '2026-02-03', valor: 3000 }] },
      today: '2026-02-28',
    });
    const d = monthDetail(r, '2026-02')!;
    expect(d).toMatchObject({ mes: '2026-02', inicio: 110, fin: 3285, aportado: 161, nuevo: 3000, comisiones: 1, hasta: '2026-02-28' });
    // Mercado: A +20 (de 110+111−1 a 240), B −5
    expect(d.mercado).toBe(15);
    const by = Object.fromEntries(d.productos.map((p) => [p.holdingId, p]));
    expect(by.CTA).toMatchObject({ inicio: 0, aportado: 0, nuevo: 3000, mercado: 0, fin: 3000 });
    expect(by.A).toMatchObject({ inicio: 110, aportado: 111, comisiones: 1, mercado: 20, fin: 240 });
    expect(by.B).toMatchObject({ inicio: 0, aportado: 50, mercado: -5, fin: 45 });
    expect(d.productos[0]!.holdingId).toBe('CTA');
    expect(monthDetail(r, '2025-12')).toBeNull();
  });
});

describe('hitos', () => {
  it('primer día en que se supera cada cifra y lo que falta para la siguiente', () => {
    const series = [
      { fecha: '2026-01-01', valor: 800 },
      { fecha: '2026-02-01', valor: 1200 },
      { fecha: '2026-03-01', valor: 900 },
      // Ese día empiezas a seguir una cuenta de 5.000 €: el hito no se celebra
      { fecha: '2026-04-01', valor: 6000, nuevo: 5000 },
    ];
    const m = milestones(series);
    expect(m.logrados).toEqual([
      { importe: 1000, fecha: '2026-02-01', alEmpezar: false },
      { importe: 5000, fecha: '2026-04-01', alEmpezar: true },
    ]);
    expect(m.siguiente).toEqual({ importe: 10000, falta: 4000, progreso: 0.6 });
    expect(milestones([]).siguiente).toEqual({ importe: 1000, falta: 1000, progreso: 0 });
  });
});

describe('comisiones fijas', () => {
  it('custodia de 25 €/año: entra en el coste anual y, cuando se cobra en efectivo, cuenta como dinero tuyo', () => {
    const r = computePortfolio({
      holdings: [H('SAB', { tipo: 'accion', ter: null, comisionFija: 25 }), H('F', { ter: 0.002 })],
      txs: [
        T({ holdingId: 'SAB', tipo: 'compra', fecha: '2026-01-10', cantidad: 300, importe: 900 }),
        T({ holdingId: 'F', tipo: 'compra', fecha: '2026-01-10', cantidad: 100, importe: 1000 }),
        // El banco cobra la custodia del semestre de la cuenta: sin participaciones
        T({ holdingId: 'SAB', tipo: 'comision', fecha: '2026-06-30', cantidad: 0, importe: 12.5 }),
      ],
      prices: { 'asset-SAB': [{ fecha: '2026-01-10', precio: 3 }], 'asset-F': [{ fecha: '2026-01-10', precio: 10 }] },
      today: '2026-07-15',
    });
    expect(r.metrics.comisionesFijas).toBe(25);
    expect(r.metrics.costeAnual).toBe(27); // 1000 × 0,2 % + 25
    expect(r.metrics.terMedio).toBeCloseTo(0.002, 10);
    // Pagar la custodia sube lo aportado y baja la ganancia; no es «mercado»
    expect(r.metrics.aportado).toBe(1912.5);
    expect(r.metrics.ganancia).toBe(-12.5);
    expect(r.metrics.comisionesPagadas).toBe(12.5);
    const jun = r.months.find((m) => m.mes === '2026-06')!;
    expect([jun.aportado, jun.comisiones, jun.ganancia]).toEqual([12.5, 12.5, 0]);
    expect(r.positions.find((p) => p.holdingId === 'SAB')!.cantidad).toBe(300);
  });
});
