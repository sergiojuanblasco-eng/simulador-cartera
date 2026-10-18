import { describe, expect, it } from 'vitest';
import { xirr } from '../src/xirr';

describe('xirr', () => {
  it('coincide con el ejemplo oficial de XIRR de Excel (37,34 %)', () => {
    const r = xirr([
      { fecha: '2008-01-01', importe: -10000 },
      { fecha: '2008-03-01', importe: 2750 },
      { fecha: '2008-10-30', importe: 4250 },
      { fecha: '2009-02-15', importe: 3250 },
      { fecha: '2009-04-01', importe: 2750 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.373362535, 6);
  });

  it('una inversión que se duplica en un año exacto da ~100 %', () => {
    const r = xirr([
      { fecha: '2025-01-01', importe: -1000 },
      { fecha: '2026-01-01', importe: 2000 },
    ]);
    expect(r!).toBeCloseTo(1, 2);
  });

  it('pérdidas fuertes convergen (bisección de respaldo)', () => {
    const r = xirr([
      { fecha: '2024-01-01', importe: -1000 },
      { fecha: '2025-01-01', importe: 50 },
    ]);
    expect(r!).toBeCloseTo(-0.95, 2);
  });

  it('no anualiza menos de 90 días', () => {
    expect(xirr([
      { fecha: '2026-01-01', importe: -1000 },
      { fecha: '2026-02-01', importe: 1050 },
    ])).toBeNull();
  });

  it('sin flujos de ambos signos devuelve null', () => {
    expect(xirr([
      { fecha: '2024-01-01', importe: -1000 },
      { fecha: '2025-01-01', importe: -500 },
    ])).toBeNull();
  });
});
