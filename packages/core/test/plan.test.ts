import { describe, expect, it } from 'vitest';
import { splitContribution } from '../src/plan';

const sum = (xs: { importe: number }[]) => Math.round(xs.reduce((a, x) => a + x.importe, 0) * 100) / 100;

describe('reparto de la aportación', () => {
  it('fijo: cada producto recibe su %', () => {
    const r = splitContribution(300, [{ key: 'A', peso: 60, actual: 0 }, { key: 'B', peso: 30, actual: 0 }, { key: 'C', peso: 10, actual: 0 }], 'fijo');
    expect(r.map((x) => x.importe)).toEqual([180, 90, 30]);
  });

  it('equilibrar: el dinero va a lo que está por debajo', () => {
    // Objetivo 50/50, hoy 1000/0 → todo a B
    const r = splitContribution(100, [{ key: 'A', peso: 50, actual: 1000 }, { key: 'B', peso: 50, actual: 0 }], 'equilibrar');
    expect(r.map((x) => x.importe)).toEqual([0, 100]);
    expect(r[1]!.pesoDespues).toBeCloseTo(100 / 1100, 10);
  });

  it('equilibrar: si ya estás en objetivo, equivale a fijo', () => {
    const r = splitContribution(200, [{ key: 'A', peso: 80, actual: 800 }, { key: 'B', peso: 20, actual: 200 }], 'equilibrar');
    expect(r.map((x) => x.importe)).toEqual([160, 40]);
  });

  it('equilibrar con aportación grande: deja la cartera en su objetivo', () => {
    const r = splitContribution(1000, [{ key: 'A', peso: 50, actual: 900 }, { key: 'B', peso: 50, actual: 100 }], 'equilibrar');
    expect(r.map((x) => x.importe)).toEqual([100, 900]);
    expect(r.every((x) => Math.abs(x.pesoDespues - 0.5) < 1e-9)).toBe(true);
  });

  it('redondea a euros y la suma cuadra siempre', () => {
    const r = splitContribution(250, [{ key: 'A', peso: 1, actual: 0 }, { key: 'B', peso: 1, actual: 0 }, { key: 'C', peso: 1, actual: 0 }], 'fijo');
    expect(sum(r)).toBe(250);
    expect(r.every((x) => Number.isInteger(x.importe))).toBe(true);
    const small = splitContribution(10, [{ key: 'A', peso: 1, actual: 0 }, { key: 'B', peso: 2, actual: 0 }], 'fijo');
    expect(sum(small)).toBe(10);
    expect(small.map((x) => x.importe)).toEqual([3.33, 6.67]);
  });

  it('sin pesos válidos no reparte', () => {
    expect(splitContribution(100, [], 'fijo')).toEqual([]);
    expect(splitContribution(100, [{ key: 'A', peso: 0, actual: 5 }], 'equilibrar')).toEqual([]);
  });
});
