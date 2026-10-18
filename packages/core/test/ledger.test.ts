import { describe, expect, it } from 'vitest';
import { lotTotals, runLedger } from '../src/ledger';
import type { CoreTx } from '../src/types';

const tx = (p: Partial<CoreTx> & Pick<CoreTx, 'tipo' | 'fecha'>): CoreTx => ({
  id: Math.random().toString(36).slice(2),
  holdingId: 'A',
  cantidad: 0,
  importe: 0,
  ...p,
});

describe('FIFO', () => {
  it('la venta consume primero los lotes más antiguos', () => {
    const r = runLedger([
      tx({ tipo: 'compra', fecha: '2025-01-10', cantidad: 10, importe: 100 }), // 10 €/part
      tx({ tipo: 'compra', fecha: '2025-02-10', cantidad: 10, importe: 200 }), // 20 €/part
      tx({ tipo: 'venta', fecha: '2025-03-10', cantidad: 15, importe: 375 }),  // 25 €/part
    ]);
    // Coste FIFO de 15 participaciones = 10×10 + 5×20 = 200 → ganancia 175
    expect(r.realized).toHaveLength(1);
    expect(r.realized[0]!.coste).toBeCloseTo(200, 8);
    expect(r.realized[0]!.ganancia).toBeCloseTo(175, 8);
    const left = lotTotals(r.lots.get('A'));
    expect(left.cantidad.toNumber()).toBe(5);
    expect(left.coste.toNumber()).toBeCloseTo(100, 8);
  });

  it('las comisiones de compra suben el coste y las de venta bajan el neto', () => {
    const r = runLedger([
      tx({ tipo: 'compra', fecha: '2025-01-10', cantidad: 10, importe: 100, comision: 2 }),
      tx({ tipo: 'venta', fecha: '2025-06-10', cantidad: 10, importe: 150, comision: 3 }),
    ]);
    expect(r.realized[0]!.importe).toBe(147);
    expect(r.realized[0]!.coste).toBe(102);
    expect(r.realized[0]!.ganancia).toBe(45);
  });

  it('el traspaso conserva coste y fecha originales y no genera ganancia', () => {
    const r = runLedger([
      tx({ tipo: 'compra', fecha: '2024-01-10', cantidad: 100, importe: 1000 }),
      tx({ tipo: 'compra', fecha: '2024-06-10', cantidad: 100, importe: 1500 }),
      tx({ tipo: 'traspaso_salida', fecha: '2025-01-10', cantidad: 150, importe: 2400, grupoId: 'g1' }),
      tx({ tipo: 'traspaso_entrada', holdingId: 'B', fecha: '2025-01-10', cantidad: 60, importe: 2400, grupoId: 'g1' }),
    ]);
    expect(r.realized).toHaveLength(0);
    const a = lotTotals(r.lots.get('A'));
    const b = lotTotals(r.lots.get('B'));
    expect(a.cantidad.toNumber()).toBe(50);
    expect(a.coste.toNumber()).toBeCloseTo(750, 8);
    // B recibe 60 participaciones con el coste de 100 + 50 participaciones de origen = 1000 + 750
    expect(b.cantidad.toNumber()).toBeCloseTo(60, 8);
    expect(b.coste.toNumber()).toBeCloseTo(1750, 8);
    expect(r.lots.get('B')![0]!.fecha).toBe('2024-01-10');
  });

  it('avisa si se vende más de lo que hay', () => {
    const r = runLedger([
      tx({ tipo: 'compra', fecha: '2025-01-10', cantidad: 1, importe: 10 }),
      tx({ tipo: 'venta', fecha: '2025-02-10', cantidad: 2, importe: 25 }),
    ]);
    expect(r.warnings.some((w) => w.includes('más participaciones'))).toBe(true);
  });

  it('no pierde céntimos con decimales largos', () => {
    const txs: CoreTx[] = [];
    for (let i = 0; i < 3; i++) txs.push(tx({ tipo: 'compra', fecha: `2025-0${i + 1}-01`, cantidad: '0.1', importe: '0.10' }));
    const r = runLedger(txs);
    const t = lotTotals(r.lots.get('A'));
    expect(t.cantidad.toString()).toBe('0.3');
    expect(t.coste.toString()).toBe('0.3');
  });
});
