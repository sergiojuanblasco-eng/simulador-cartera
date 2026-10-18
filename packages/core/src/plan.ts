/**
 * Cartera objetivo: cómo repartir una aportación entre los productos del plan.
 *
 *  - «fijo»: cada producto recibe su % de la aportación (lo que haría un plan de inversión automático).
 *  - «equilibrar»: el dinero nuevo va a los productos que están por debajo de su %,
 *    para acercar la cartera a su objetivo sin vender nada.
 */

export type SplitMode = 'equilibrar' | 'fijo';

export interface PlanSlot {
  key: string;
  /** Peso objetivo (cualquier escala: se normaliza). */
  peso: number;
  /** Valor actual en EUR. */
  actual: number;
}

export interface SplitLine {
  key: string;
  importe: number;
  pesoObjetivo: number;
  pesoActual: number;
  pesoDespues: number;
}

/** Reparte `total` en múltiplos de `step` respetando las proporciones (método del mayor resto). */
function roundTo(raw: number[], total: number, step: number): number[] {
  const units = Math.round(total / step);
  const floors = raw.map((r) => Math.floor(r / step + 1e-9));
  let left = units - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rest: r / step - floors[i]! })).filter((x) => raw[x.i]! > 0).sort((a, b) => b.rest - a.rest);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length, left--) floors[order[k]!.i]!++;
  return floors.map((u) => Math.round(u * step * 100) / 100);
}

export function splitContribution(amount: number, slots: PlanSlot[], mode: SplitMode): SplitLine[] {
  const sumW = slots.reduce((a, s) => a + Math.max(0, s.peso), 0);
  if (!slots.length || sumW <= 0) return [];
  const w = slots.map((s) => Math.max(0, s.peso) / sumW);
  const actual = slots.map((s) => Math.max(0, s.actual));
  const totalActual = actual.reduce((a, b) => a + b, 0);
  const amt = Math.max(0, amount);
  const T = totalActual + amt;

  let raw: number[];
  if (mode === 'fijo' || totalActual <= 0) {
    raw = w.map((x) => amt * x);
  } else {
    // Lo que le falta a cada producto para estar en su % tras aportar.
    // Siempre suman al menos `amount`, así que se reparte en proporción a lo que falta.
    const deficit = w.map((x, i) => Math.max(0, x * T - actual[i]!));
    const D = deficit.reduce((a, b) => a + b, 0);
    raw = D > 0 ? deficit.map((d) => (amt * d) / D) : w.map((x) => amt * x);
  }

  const step = amt >= 100 ? 1 : 0.01;
  const importes = roundTo(raw, amt, step);
  return slots.map((s, i) => ({
    key: s.key,
    importe: importes[i]!,
    pesoObjetivo: w[i]!,
    pesoActual: totalActual > 0 ? actual[i]! / totalActual : 0,
    pesoDespues: T > 0 ? (actual[i]! + importes[i]!) / T : 0,
  }));
}
